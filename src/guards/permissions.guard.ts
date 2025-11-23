import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionDefinition, PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../modules/rbac/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbacService: RbacService) {}

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
    const userId = request.user?.sub;

    if (!tenantId || !userId) {
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
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
