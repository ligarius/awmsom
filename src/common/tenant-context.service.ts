import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  getTenantId(): string {
    const user = (this.request as any)?.user;
    if (user?.tenantId) {
      return user.tenantId;
    }
    const tenantId = (this.request as any)?.tenantId;
    if (tenantId) {
      return tenantId as string;
    }
    throw new Error('Tenant context not available');
  }
}
