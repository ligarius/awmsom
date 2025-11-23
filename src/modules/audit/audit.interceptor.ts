import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { PERMISSIONS_KEY, PermissionDefinition } from '../../decorators/permissions.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.recordTrace(context, request, startTime),
        error: () => this.recordTrace(context, request, startTime, true),
      }),
    );
  }

  private recordTrace(
    context: ExecutionContext,
    request: Request,
    startTime: number,
    isError = false,
  ) {
    const response = context.switchToHttp().getResponse<Response>();
    const durationMs = Date.now() - startTime;
    const statusCode = response?.statusCode || (isError ? 500 : 200);
    const metadata = this.reflector.getAllAndOverride<PermissionDefinition[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.auditService.recordTrace({
      method: request.method,
      path: request.originalUrl,
      statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    });

    const resource = metadata?.[0]?.resource ?? request.path;
    const action = metadata?.[0]?.action ?? request.method;
    const tenantId = (request as any).tenantId || (request as any)?.user?.tenantId;

    if (!tenantId) {
      return;
    }

    this.auditService.recordLog({
      tenantId,
      userId: (request as any)?.user?.sub,
      resource: resource as unknown as PermissionResource,
      action: action as unknown as PermissionAction,
      entityId: (request.params as any)?.id,
      metadata: {
        statusCode,
        durationMs,
        body: request.method !== 'GET' ? request.body : undefined,
      },
      ipAddress: (request as any)?.auditMeta?.ipAddress ?? request.ip,
      userAgent: (request as any)?.auditMeta?.userAgent ?? request.headers['user-agent'],
    });
  }
}
