import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionDefinition, PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../modules/rbac/rbac.service';
import { PLATFORM_ROLES } from '../common/auth.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbacService: RbacService) {}
  private readonly logger = new Logger(PermissionsGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionDefinition[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || !requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.user?.tenantId;
    const userId = request.user?.id ?? request.user?.sub;
    const roles = Array.isArray(request.user?.roles)
      ? request.user.roles
      : request.user?.role
      ? [request.user.role]
      : [];
    const isPlatform = roles.some((role: string) => PLATFORM_ROLES.has(role));

    if (isPlatform) {
      return true;
    }

    if (!tenantId || !userId) {
      this.logger.warn('Permission guard missing context', {
        tenantId,
        userId,
        required: requiredPermissions,
      });
      throw new ForbiddenException('Missing authentication context');
    }

    const userPermissions = await this.rbacService.getUserPermissions(tenantId, userId);
    request.userPermissions = userPermissions;

    const hasPermission = requiredPermissions.every((required) =>
      userPermissions.some(
        (userPerm) => userPerm.resource === required.resource && userPerm.action === required.action,
      ),
    );

    if (!hasPermission) {
      this.logger.warn('Permission denied', {
        tenantId,
        userId,
        required: requiredPermissions,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
