import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, NotFoundError } from '../../shared/middleware/index.js';
import { createAuditLog, AuditActions } from '../../shared/utils/index.js';
import type { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';

// Schemas
const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2).default('DE'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isTemporary: z.boolean().default(false),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const createSalesInstanceSchema = z.object({
  organizationId: z.string(),
  locationId: z.string(),
  name: z.string().min(1).max(200),
  type: z.enum(['FOODTRUCK', 'RESTAURANT', 'GHOST_KITCHEN', 'SUPERMARKET', 'POP_UP', 'FESTIVAL_STAND']),
  settings: z.record(z.unknown()).optional(),
});

const operatingHourSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean().default(true),
});

const router = Router();

// GET /locations
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const { city, country, isTemporary } = req.query;

      const locations = await prisma.location.findMany({
        where: {
          ...(city && { city: String(city) }),
          ...(country && { country: String(country) }),
          ...(isTemporary !== undefined && { isTemporary: isTemporary === 'true' }),
        },
        include: {
          _count: { select: { salesInstances: true } },
        },
        take: 100,
      });

      res.json({ success: true, data: locations });
    } catch (error) {
      next(error);
    }
  }
);

// GET /locations/:id
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const location = await prisma.location.findUnique({
        where: { id: req.params.id },
        include: {
          salesInstances: {
            include: {
              organization: { select: { id: true, name: true, slug: true } },
              operatingHours: true,
            },
          },
        },
      });

      if (!location) throw new NotFoundError('Location');

      res.json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }
);

// POST /locations
router.post(
  '/',
  authenticate,
  requirePermission({ permission: 'location.create' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = createLocationSchema.parse(req.body);

      const location = await prisma.location.create({
        data: {
          ...input,
          validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.LOCATION_CREATE,
        resource: 'location',
        resourceId: location.id,
        req,
      });

      res.status(201).json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }
);

// GET /sales-instances
router.get(
  '/sales-instances/list',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const { type, organizationId, isActive } = req.query;

      const instances = await prisma.salesInstance.findMany({
        where: {
          ...(type && { type: String(type) as any }),
          ...(organizationId && { organizationId: String(organizationId) }),
          ...(isActive !== undefined && { isActive: isActive === 'true' }),
        },
        include: {
          location: true,
          organization: { select: { id: true, name: true, slug: true } },
          operatingHours: true,
        },
        take: 100,
      });

      res.json({ success: true, data: instances });
    } catch (error) {
      next(error);
    }
  }
);

// POST /sales-instances
router.post(
  '/sales-instances',
  authenticate,
  requirePermission({ permission: 'sales_instance.create' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = createSalesInstanceSchema.parse(req.body);

      const instance = await prisma.salesInstance.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          name: input.name,
          type: input.type,
          settings: input.settings ?? {},
        },
        include: {
          location: true,
          organization: { select: { id: true, name: true } },
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.SALES_INSTANCE_CREATE,
        resource: 'sales_instance',
        resourceId: instance.id,
        req,
      });

      res.status(201).json({ success: true, data: instance });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /sales-instances/:id/hours
router.put(
  '/sales-instances/:id/hours',
  authenticate,
  requirePermission({ permission: 'sales_instance.update' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const hours = z.array(operatingHourSchema).parse(req.body);

      // Delete existing and create new
      await prisma.$transaction([
        prisma.operatingHour.deleteMany({
          where: { salesInstanceId: req.params.id },
        }),
        prisma.operatingHour.createMany({
          data: hours.map((h) => ({
            salesInstanceId: req.params.id,
            ...h,
          })),
        }),
      ]);

      const updated = await prisma.operatingHour.findMany({
        where: { salesInstanceId: req.params.id },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

export const locationRoutes = router;
