import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma, env } from '../../config/index.js';
import { hashPassword, verifyPassword, createAuditLog, AuditActions } from '../../shared/utils/index.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/middleware/index.js';
import type { RegisterInput, LoginInput, ChangePasswordInput } from './schemas.js';
import type { AuthenticatedRequest } from '../../shared/types/index.js';

interface AuthResult {
  user: {
    id: string;
    email: string;
  };
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

export class AuthService {
  async register(input: RegisterInput, req?: AuthenticatedRequest): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
      },
    });

    // Assign default consumer role
    const consumerRole = await prisma.role.findUnique({
      where: { name: 'consumer' },
    });

    if (consumerRole) {
      await prisma.userRoleAssignment.create({
        data: {
          userId: user.id,
          roleId: consumerRole.id,
        },
      });
    }

    // Create session
    const session = await this.createSession(user.id, req);

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.USER_REGISTER,
      resource: 'user',
      resourceId: user.id,
      req,
    });

    return {
      user: { id: user.id, email: user.email },
      token: session.token,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  }

  async login(input: LoginInput, req?: AuthenticatedRequest): Promise<AuthResult> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const session = await this.createSession(user.id, req);

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.USER_LOGIN,
      resource: 'user',
      resourceId: user.id,
      req,
    });

    return {
      user: { id: user.id, email: user.email },
      token: session.token,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  }

  async logout(sessionId: string, req?: AuthenticatedRequest): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      await prisma.session.delete({
        where: { id: sessionId },
      });

      await createAuditLog({
        userId: session.userId,
        action: AuditActions.USER_LOGOUT,
        resource: 'session',
        resourceId: sessionId,
        req,
      });
    }
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    req?: AuthenticatedRequest
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(input.newPassword);

    // Update password and invalidate all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.session.deleteMany({
        where: { userId },
      }),
    ]);

    await createAuditLog({
      userId,
      action: AuditActions.USER_PASSWORD_RESET,
      resource: 'user',
      resourceId: userId,
      req,
    });
  }

  async refreshSession(sessionId: string): Promise<AuthResult | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Create new session
    const newSession = await this.createSession(session.userId);

    // Delete old session
    await prisma.session.delete({
      where: { id: sessionId },
    });

    return {
      user: { id: session.user.id, email: session.user.email },
      token: newSession.token,
      csrfToken: newSession.csrfToken,
      expiresAt: newSession.expiresAt,
    };
  }

  private async createSession(userId: string, req?: AuthenticatedRequest) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const csrfToken = crypto.randomBytes(32).toString('hex');

    const session = await prisma.session.create({
      data: {
        userId,
        token: crypto.randomBytes(32).toString('hex'),
        csrfToken,
        userAgent: req?.headers['user-agent'] ?? null,
        ipAddress: req?.ip ?? null,
        expiresAt,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId, sessionId: session.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return { ...session, token };
  }
}

export const authService = new AuthService();
