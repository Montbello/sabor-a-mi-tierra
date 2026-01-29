import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, NotFoundError } from '../../shared/middleware/index.js';
import { createAuditLog, AuditActions } from '../../shared/utils/index.js';
import type { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';

// Schemas
const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  displayName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().datetime().optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const preferenceSchema = z.object({
  category: z.string(),
  key: z.string(),
  value: z.unknown(),
});

const dietarySchema = z.object({
  type: z.enum(['allergy', 'intolerance', 'diet']),
  name: z.string(),
  severity: z.string().optional(),
  notes: z.string().optional(),
});

const consentSchema = z.object({
  type: z.string(),
  granted: z.boolean(),
  version: z.string(),
});

const router = Router();

// GET /profile
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user!.id },
        include: {
          preferences: true,
          dietaryRestrictions: true,
          consents: { where: { revokedAt: null } },
        },
      });

      if (!profile) throw new NotFoundError('Profile');

      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /profile
router.patch(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = updateProfileSchema.parse(req.body);

      const profile = await prisma.profile.update({
        where: { userId: req.user!.id },
        data: {
          ...input,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.PROFILE_UPDATE,
        resource: 'profile',
        resourceId: profile.id,
        req,
      });

      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }
);

// POST /profile/preferences
router.post(
  '/preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = preferenceSchema.parse(req.body);
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (!profile) throw new NotFoundError('Profile');

      const preference = await prisma.profilePreference.upsert({
        where: {
          profileId_category_key: {
            profileId: profile.id,
            category: input.category,
            key: input.key,
          },
        },
        create: {
          profileId: profile.id,
          category: input.category,
          key: input.key,
          value: input.value as object,
        },
        update: { value: input.value as object },
      });

      res.json({ success: true, data: preference });
    } catch (error) {
      next(error);
    }
  }
);

// POST /profile/dietary
router.post(
  '/dietary',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = dietarySchema.parse(req.body);
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (!profile) throw new NotFoundError('Profile');

      const dietary = await prisma.dietaryRestriction.upsert({
        where: {
          profileId_type_name: {
            profileId: profile.id,
            type: input.type,
            name: input.name,
          },
        },
        create: {
          profileId: profile.id,
          ...input,
        },
        update: input,
      });

      res.json({ success: true, data: dietary });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /profile/dietary/:type/:name
router.delete(
  '/dietary/:type/:name',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (!profile) throw new NotFoundError('Profile');

      await prisma.dietaryRestriction.delete({
        where: {
          profileId_type_name: {
            profileId: profile.id,
            type: req.params.type,
            name: req.params.name,
          },
        },
      });

      res.json({ success: true, data: { message: 'Dietary restriction removed' } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /profile/consents
router.post(
  '/consents',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = consentSchema.parse(req.body);
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (!profile) throw new NotFoundError('Profile');

      // Revoke existing consent of same type
      await prisma.consent.updateMany({
        where: { profileId: profile.id, type: input.type, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Create new consent record
      const consent = await prisma.consent.create({
        data: {
          profileId: profile.id,
          type: input.type,
          granted: input.granted,
          grantedAt: new Date(),
          version: input.version,
          ipAddress: req.ip,
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        action: AuditActions.CONSENT_UPDATE,
        resource: 'consent',
        resourceId: consent.id,
        metadata: { type: input.type, granted: input.granted },
        req,
      });

      res.json({ success: true, data: consent });
    } catch (error) {
      next(error);
    }
  }
);

export const profileRoutes = router;
