import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ComplianceScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user ?? {};
    const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];

    if (permissions.includes('compliance:manage') || user.role === 'ADMIN') {
      return true;
    }

    throw new ForbiddenException('Missing compliance scope');
  }
}
