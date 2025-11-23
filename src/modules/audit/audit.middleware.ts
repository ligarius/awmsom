import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly auditService: AuditService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    (req as any).auditMeta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    this.auditService.recordEvent({
      method: req.method,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });

    next();
  }
}
