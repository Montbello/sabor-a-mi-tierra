import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { registerSchema, loginSchema, changePasswordSchema } from './schemas.js';
import { authenticate, verifyCsrf } from '../../shared/middleware/index.js';
import { env } from '../../config/index.js';
import type { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';

const router = Router();

// Cookie options for auth token
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// POST /auth/register
router.post(
  '/register',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input, req);

      // Set auth token in httpOnly cookie
      res.cookie('auth_token', result.token, cookieOptions);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/login
router.post(
  '/login',
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input, req);

      // Set auth token in httpOnly cookie
      res.cookie('auth_token', result.token, cookieOptions);

      res.json({
        success: true,
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/logout
router.post(
  '/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      if (req.user?.sessionId) {
        await authService.logout(req.user.sessionId, req);
      }

      // Clear auth cookie
      res.clearCookie('auth_token', { path: '/' });

      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/change-password
router.post(
  '/change-password',
  authenticate,
  verifyCsrf,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const input = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user!.id, input, req);

      // Clear auth cookie (user needs to re-login)
      res.clearCookie('auth_token', { path: '/' });

      res.json({
        success: true,
        data: { message: 'Password changed successfully. Please log in again.' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /auth/me
router.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: {
          user: {
            id: req.user!.id,
            email: req.user!.email,
          },
          roles: req.user!.roles.map((r) => ({
            name: r.role.name,
            domain: r.role.domain,
            organizationId: r.organizationId,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/refresh
router.post(
  '/refresh',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const result = await authService.refreshSession(req.user!.sessionId);

      if (!result) {
        res.clearCookie('auth_token', { path: '/' });
        res.status(401).json({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'Session expired' },
        });
        return;
      }

      res.cookie('auth_token', result.token, cookieOptions);

      res.json({
        success: true,
        data: {
          user: result.user,
          csrfToken: result.csrfToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const authRoutes = router;
