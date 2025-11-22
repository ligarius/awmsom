import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from './monitoring.service';
import { Request, Response } from 'express';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.recordMetrics(context, request, startTime),
        error: () => this.recordMetrics(context, request, startTime, true),
      }),
    );
  }

  private recordMetrics(
    context: ExecutionContext,
    request: Request,
    startTime: number,
    isError = false,
  ) {
    const response = context.switchToHttp().getResponse<Response>();
    const durationMs = Date.now() - startTime;
    const statusCode = response?.statusCode || (isError ? 500 : 200);

    this.monitoringService.recordRequestMetrics(
      request.method,
      request.originalUrl,
      statusCode,
      durationMs,
    );
  }
}
