import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PLATFORM_ROLES } from '../common/auth.constants';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const roles = Array.isArray(request.user?.roles)
      ? request.user.roles
      : request.user?.role
      ? [request.user.role]
      : [];
    const isPlatform = roles.some((role: string) => PLATFORM_ROLES.has(role));

    if (!isPlatform) {
      throw new ForbiddenException('Platform access required');
    }

    return true;
  }
}
