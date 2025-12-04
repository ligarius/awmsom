import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path: string = request.path || '';

    if (
      path.startsWith('/auth/login') ||
      path.startsWith('/tenants') ||
      path.startsWith('/public/onboarding') ||
      path.startsWith('/admin')
    ) {
      return true;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!request.user) {
      const token = this.extractBearerToken(request) ?? this.extractCookieToken(request);

      if (!token) {
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
        throw new ForbiddenException('Invalid authentication token');
      }
    }

    const user = request.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant is required');
    }

    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Inactive tenant');
    }

    request.tenantId = user.tenantId;
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
    if (tokenFromCookies) {
      return tokenFromCookies;
    }

    const cookieHeader = request.headers?.cookie;
    if (!cookieHeader || typeof cookieHeader !== 'string') {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie: string) => cookie.trim());
    const tokenCookie = cookies.find((cookie) => cookie.startsWith('awms_token='));

    if (!tokenCookie) {
      return undefined;
    }

    return decodeURIComponent(tokenCookie.substring('awms_token='.length));
  }
}
