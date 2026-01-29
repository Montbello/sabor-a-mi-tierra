import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, NotFoundError } from '../../shared/middleware/index.js';
import { createAuditLog, AuditActions } from '../../shared/utils/index.js';
import type { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';

// Schemas
const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  type: z.enum(['FRANCHISE', 'PARTNER', 'SUPPLIER', 'TECH_PARTNER', 'EVENT_ORGANIZER']),
  settings: z.record(z.unknown()).optional(),
});

const updateOrgSchema = createOrgSchema.partial();

const addMemberSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

const router = Router();

// GET /organizations
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      // Get organizations user has access to
      const userOrgIds = req.user!.roles
        .filter((r) => r.organizationId)
        .map((r) => r.organizationId!);

      const organizations = await prisma.organization.findMany({
        where: { id: { in: userOrgIds } },
        include: {
          _count: { select: { members: true, salesInstances: true } },
        },
      });

      res.json({ success: true, data: organizations });
    } catch (error) {
      next(error);
    }
  }
);

// GET /organizations/:id
router.get(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.params.id },
        include: {
          members: {
            include: {
              user: { select: { id: true, email: true } },
              role: { select: { id: true, name: true, displayName: true } },
            },
          },
          _count: { select: { salesInstances: true, menus: true } },
        },
      });

      if (!org) throw new NotFoundError('Organization');

      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }
);

// POST /organizations
router.post(
  '/',
  authenticate,
  requirePermission({ permission: 'organization.create' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = createOrgSchema.parse(req.body);

      const org = await prisma.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          type: input.type,
          settings: input.settings ?? {},
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.ORG_CREATE,
        resource: 'organization',
        resourceId: org.id,
        req,
      });

      res.status(201).json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /organizations/:id
router.patch(
  '/:id',
  authenticate,
  requirePermission({ permission: 'organization.update' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = updateOrgSchema.parse(req.body);

      const org = await prisma.organization.update({
        where: { id: req.params.id },
        data: input,
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.ORG_UPDATE,
        resource: 'organization',
        resourceId: org.id,
        req,
      });

      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }
);

// POST /organizations/:id/members
router.post(
  '/:id/members',
  authenticate,
  requirePermission({ permission: 'organization.member.add' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = addMemberSchema.parse(req.body);

      const member = await prisma.userRoleAssignment.create({
        data: {
          userId: input.userId,
          roleId: input.roleId,
          organizationId: req.params.id,
          assignedBy: req.user!.id,
        },
        include: {
          user: { select: { id: true, email: true } },
          role: { select: { id: true, name: true } },
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.ORG_MEMBER_ADD,
        resource: 'organization',
        resourceId: req.params.id,
        metadata: { memberId: input.userId },
        req,
      });

      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /organizations/:id/members/:userId
router.delete(
  '/:id/members/:userId',
  authenticate,
  requirePermission({ permission: 'organization.member.remove' }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      await prisma.userRoleAssignment.deleteMany({
        where: {
          organizationId: req.params.id,
          userId: req.params.userId,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.ORG_MEMBER_REMOVE,
        resource: 'organization',
        resourceId: req.params.id,
        metadata: { memberId: req.params.userId },
        req,
      });

      res.json({ success: true, data: { message: 'Member removed' } });
    } catch (error) {
      next(error);
    }
  }
);

export const organizationRoutes = router;
