import { prisma } from '../../config/index.js';
import type { AuthenticatedRequest } from '../types/index.js';

interface AuditLogParams {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  req?: AuthenticatedRequest;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const { userId, action, resource, resourceId, metadata, req } = params;

  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      resourceId,
      metadata: metadata ?? undefined,
      ipAddress: req?.ip ?? null,
      userAgent: req?.headers['user-agent'] ?? null,
    },
  });
}

// Pre-defined audit actions
export const AuditActions = {
  // Auth
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  USER_PASSWORD_RESET: 'user.password_reset',
  
  // User management
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  
  // Organization
  ORG_CREATE: 'organization.create',
  ORG_UPDATE: 'organization.update',
  ORG_MEMBER_ADD: 'organization.member.add',
  ORG_MEMBER_REMOVE: 'organization.member.remove',
  
  // Profile
  PROFILE_UPDATE: 'profile.update',
  CONSENT_UPDATE: 'consent.update',
  
  // Products
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  MENU_UPDATE: 'menu.update',
  
  // Locations
  LOCATION_CREATE: 'location.create',
  SALES_INSTANCE_CREATE: 'sales_instance.create',
} as const;
