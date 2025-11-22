import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly auditService: AuditService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    this.auditService.recordEvent({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      details: { headers: req.headers },
    });

    next();
  }
}
