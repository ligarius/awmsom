import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MonitoringService {
  private readonly register: Registry;
  private readonly requestCounter: Counter<'method' | 'path' | 'statusCode'>;
  private readonly durationHistogram: Histogram<'method' | 'path' | 'statusCode'>;
  private totalRequests = 0;

  constructor(private readonly auditService: AuditService) {
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register });

    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests received.',
      labelNames: ['method', 'path', 'statusCode'],
      registers: [this.register],
    });

    this.durationHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Histogram of HTTP request durations in seconds.',
      labelNames: ['method', 'path', 'statusCode'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.register],
    });
  }

  recordRequestMetrics(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ) {
    const labels = { method, path, statusCode: statusCode.toString() };
    this.requestCounter.inc(labels);
    this.durationHistogram.observe(labels, durationMs / 1000);
    this.totalRequests += 1;
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getMetricsContentType(): string {
    return this.register.contentType;
  }

  async getHealthSummary() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      audit: {
        events: this.auditService.getEvents().length,
        traces: this.auditService.getTraces().length,
      },
      metrics: {
        totalRequests: this.totalRequests,
      },
    };
  }
}
