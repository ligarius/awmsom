import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_ROLES } from '../common/auth.constants';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(TenantGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path: string = request.path || '';

    if (
      path.startsWith('/auth/login') ||
      path.startsWith('/public/onboarding') ||
      path.startsWith('/auth/health') ||
      path.startsWith('/monitoring')
    ) {
      return true;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!request.user) {
      const token = this.extractBearerToken(request) ?? this.extractCookieToken(request);

      if (!token) {
        this.logger.warn(`Missing token for ${path}`);
        throw new ForbiddenException('Authentication token required');
      }

      if (!jwtSecret) {
        throw new ForbiddenException('JWT secret not configured');
      }

      try {
        const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
        request.user = {
          id: payload.sub,
          tenantId: payload.tenantId,
          roles: payload.roles,
          permissions: payload.permissions,
        };
      } catch (error) {
        const rawToken = this.extractBearerToken(request) ?? this.extractCookieToken(request);
        const tokenLength = typeof rawToken === 'string' ? rawToken.length : 0;
        const tokenParts = typeof rawToken === 'string' ? rawToken.split('.').length : 0;
        const reason = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(`Invalid token for ${path} (len=${tokenLength}, parts=${tokenParts}, reason=${reason})`);
        throw new ForbiddenException('Invalid authentication token');
      }
    }

    const user = request.user;

    const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
    const isPlatform = roles.some((role: string) => PLATFORM_ROLES.has(role));
    const overrideTenantId =
      (request.headers?.['x-tenant-id'] as string | undefined) ??
      (request.query?.tenantId as string | undefined) ??
      (request.params?.tenantId as string | undefined);
    const effectiveTenantId = isPlatform && overrideTenantId ? overrideTenantId : user?.tenantId;

    if (!effectiveTenantId) {
      this.logger.warn(`Missing tenant for ${path}`);
      throw new ForbiddenException('Tenant is required');
    }

    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: effectiveTenantId } });
    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Inactive tenant');
    }

    request.tenantId = effectiveTenantId;
    return true;
  }

  private extractBearerToken(request: any): string | undefined {
    const header = request.headers?.authorization ?? request.headers?.Authorization;
    if (!header || typeof header !== 'string') {
      return undefined;
    }

    const [scheme, value] = header.split(' ');
    if (!value || scheme?.toLowerCase() !== 'bearer') {
      return undefined;
    }

    return value.trim();
  }

  private extractCookieToken(request: any): string | undefined {
    const tokenFromCookies = request.cookies?.awms_token ?? request.cookies?.AUTH_TOKEN_COOKIE;
    if (typeof tokenFromCookies === 'string' && tokenFromCookies.trim()) {
      return tokenFromCookies;
    }

    const cookieHeader = request.headers?.cookie;
    if (!cookieHeader || typeof cookieHeader !== 'string') {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie: string) => cookie.trim());
    const tokenCookies = cookies.filter(
      (cookie) => cookie.startsWith('awms_token=') || cookie.startsWith('AUTH_TOKEN_COOKIE='),
    );

    if (!tokenCookies.length) {
      return undefined;
    }

    const candidates = tokenCookies
      .map((cookie) => {
        const [, value = ''] = cookie.split('=');
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      })
      .map((value) => value.trim())
      .filter((value) => value && value.split('.').length >= 3);

    if (!candidates.length) {
      return undefined;
    }

    return candidates.sort((a, b) => b.length - a.length)[0];
  }
}
