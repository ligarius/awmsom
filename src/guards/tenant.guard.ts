import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path: string = request.path || '';

    if (path.startsWith('/auth/login') || path.startsWith('/tenants')) {
      return true;
    }

    let user = request.user;
    if (!user && request.headers?.authorization) {
      const token = (request.headers.authorization as string).replace('Bearer ', '');
      try {
        user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        request.user = user;
      } catch (error) {
        throw new ForbiddenException('Invalid authentication token');
      }
    }

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
}
