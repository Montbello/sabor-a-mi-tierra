import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, env } from '../../config/index.js';
import { UnauthorizedError, ForbiddenError } from './error-handler.js';
import type { AuthenticatedRequest, AuthenticatedUser, PermissionCheck } from '../types/index.js';

interface JwtPayload {
  userId: string;
  sessionId: string;
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from httpOnly cookie
    const token = req.cookies?.auth_token;
    
    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    // Verify JWT
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Get session from database
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                        scope: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // Build authenticated user object
    const authenticatedUser: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      sessionId: session.id,
      roles: session.user.roleAssignments.map((ra) => ({
        role: ra.role,
        organizationId: ra.organizationId,
        permissions: ra.role.permissions.map((rp) => ({
          permission: rp.permission,
          scope: rp.scope?.name ?? null,
        })),
      })),
    };

    req.user = authenticatedUser;
    req.session = session;
    req.csrfToken = session.csrfToken;

    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(...checks: PermissionCheck[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasPermission = checks.some((check) => {
        return req.user!.roles.some((roleAssignment) => {
          // Check organization context if required
          if (check.organizationId && roleAssignment.organizationId !== check.organizationId) {
            return false;
          }

          // Check if role has the required permission
          return roleAssignment.permissions.some((perm) => {
            const permissionMatch = perm.permission.name === check.permission;
            const scopeMatch = !check.scope || perm.scope === check.scope;
            return permissionMatch && scopeMatch;
          });
        });
      });

      if (!hasPermission) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roleNames: string[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasRole = req.user.roles.some((ra) => roleNames.includes(ra.role.name));

      if (!hasRole) {
        throw new ForbiddenError('Insufficient role');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function verifyCsrf(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const csrfHeader = req.headers['x-csrf-token'];
  
  if (!csrfHeader || csrfHeader !== req.csrfToken) {
    next(new ForbiddenError('Invalid CSRF token'));
    return;
  }

  next();
}
