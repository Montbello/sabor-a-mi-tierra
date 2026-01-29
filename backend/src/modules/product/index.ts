import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, NotFoundError } from '../../shared/middleware/index.js';
import { createAuditLog, AuditActions } from '../../shared/utils/index.js';
import type { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';

// Schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  isVegan: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  ingredientIds: z.array(z.string()).optional(),
});

const createIngredientSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isAllergen: z.boolean().default(false),
  allergenCode: z.string().length(1).optional(), // EU codes A-N
  allergenName: z.string().optional(),
});

const createMenuSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  rules: z.record(z.unknown()).optional(),
});

const addMenuItemSchema = z.object({
  productId: z.string(),
  displayOrder: z.number().int().default(0),
  priceOverride: z.number().positive().optional(),
});

const router = Router();

// ===== PRODUCTS =====

// GET /products
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const { isVegan, isVegetarian, isGlutenFree, isActive } = req.query;

      const products = await prisma.product.findMany({
        where: {
          ...(isVegan !== undefined && { isVegan: isVegan === 'true' }),
          ...(isVegetarian !== undefined && { isVegetarian: isVegetarian === 'true' }),
          ...(isGlutenFree !== undefined && { isGlutenFree: isGlutenFree === 'true' }),
          ...(isActive !== undefined && { isActive: isActive === 'true' }),
        },
        include: {
          ingredients: {
            include: {
              ingredient: {
                include: { allergenInfo: true },
              },
            },
          },
        },
        take: 100,
      });

      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }
);

// GET /products/:id
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          ingredients: {
            include: {
              ingredient: { include: { allergenInfo: true } },
            },
          },
        },
      });

      if (!product) throw new NotFoundError('Product');

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
);

// POST /products
router.post(
  '/',
  authenticate,
  requirePermission({ permission: 'product.create' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = createProductSchema.parse(req.body);
      const { ingredientIds, ...productData } = input;

      const product = await prisma.product.create({
        data: {
          ...productData,
          price: productData.price,
          ...(ingredientIds && {
            ingredients: {
              create: ingredientIds.map((id) => ({ ingredientId: id })),
            },
          }),
        },
        include: {
          ingredients: { include: { ingredient: true } },
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.PRODUCT_CREATE,
        resource: 'product',
        resourceId: product.id,
        req,
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
);

// ===== INGREDIENTS =====

// GET /ingredients
router.get(
  '/ingredients/list',
  async (_req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const ingredients = await prisma.ingredient.findMany({
        include: { allergenInfo: true },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: ingredients });
    } catch (error) {
      next(error);
    }
  }
);

// POST /ingredients
router.post(
  '/ingredients',
  authenticate,
  requirePermission({ permission: 'product.create' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = createIngredientSchema.parse(req.body);
      const { allergenCode, allergenName, ...ingredientData } = input;

      const ingredient = await prisma.ingredient.create({
        data: {
          ...ingredientData,
          ...(allergenCode && allergenName && {
            allergenInfo: {
              create: {
                code: allergenCode,
                name: allergenName,
              },
            },
          }),
        },
        include: { allergenInfo: true },
      });

      res.status(201).json({ success: true, data: ingredient });
    } catch (error) {
      next(error);
    }
  }
);

// GET /allergens
router.get(
  '/allergens/list',
  async (_req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const allergens = await prisma.allergen.findMany({
        include: { ingredient: true },
        orderBy: { code: 'asc' },
      });

      res.json({ success: true, data: allergens });
    } catch (error) {
      next(error);
    }
  }
);

// ===== MENUS =====

// GET /menus
router.get(
  '/menus/list',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const { organizationId, isActive } = req.query;

      const menus = await prisma.menu.findMany({
        where: {
          ...(organizationId && { organizationId: String(organizationId) }),
          ...(isActive !== undefined && { isActive: isActive === 'true' }),
        },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      });

      res.json({ success: true, data: menus });
    } catch (error) {
      next(error);
    }
  }
);

// GET /menus/:id
router.get(
  '/menus/:id',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const menu = await prisma.menu.findUnique({
        where: { id: req.params.id },
        include: {
          organization: { select: { id: true, name: true } },
          items: {
            include: {
              product: {
                include: {
                  ingredients: {
                    include: { ingredient: { include: { allergenInfo: true } } },
                  },
                },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!menu) throw new NotFoundError('Menu');

      res.json({ success: true, data: menu });
    } catch (error) {
      next(error);
    }
  }
);

// POST /menus
router.post(
  '/menus',
  authenticate,
  requirePermission({ permission: 'menu.create' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = createMenuSchema.parse(req.body);

      const menu = await prisma.menu.create({
        data: {
          ...input,
          validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          rules: input.rules ?? {},
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.MENU_UPDATE,
        resource: 'menu',
        resourceId: menu.id,
        req,
      });

      res.status(201).json({ success: true, data: menu });
    } catch (error) {
      next(error);
    }
  }
);

// POST /menus/:id/items
router.post(
  '/menus/:id/items',
  authenticate,
  requirePermission({ permission: 'menu.update' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = addMenuItemSchema.parse(req.body);

      const menuItem = await prisma.menuItem.create({
        data: {
          menuId: req.params.id,
          productId: input.productId,
          displayOrder: input.displayOrder,
          priceOverride: input.priceOverride,
        },
        include: { product: true },
      });

      res.status(201).json({ success: true, data: menuItem });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /menus/:menuId/items/:productId
router.delete(
  '/menus/:menuId/items/:productId',
  authenticate,
  requirePermission({ permission: 'menu.update' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      await prisma.menuItem.delete({
        where: {
          menuId_productId: {
            menuId: req.params.menuId,
            productId: req.params.productId,
          },
        },
      });

      res.json({ success: true, data: { message: 'Menu item removed' } });
    } catch (error) {
      next(error);
    }
  }
);

export const productRoutes = router;
