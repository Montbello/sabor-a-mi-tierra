import type { Request } from 'express';
import type { User, Session, Role, Permission, Organization } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string;
  roles: Array<{
    role: Role;
    organizationId: string | null;
    permissions: Array<{
      permission: Permission;
      scope: string | null;
    }>;
  }>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: Session;
  csrfToken?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PermissionCheck {
  permission: string;
  scope?: string;
  organizationId?: string;
}
