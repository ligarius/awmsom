import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request, Response } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

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

    this.auditService.recordTrace({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.originalUrl,
      statusCode,
      durationMs,
    });
  }
}
