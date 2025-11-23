import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USAGE_LIMIT_KEY } from './usage.decorator';
import { UsageService } from './usage.service';

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly usageService: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<{ metric: any; increment?: number }>(USAGE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.user?.tenantId;
    if (!tenantId) {
      return true;
    }

    await this.usageService.checkLimit(tenantId, requirement.metric, requirement.increment ?? 1);
    return true;
  }
}
