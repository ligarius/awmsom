import { Injectable } from '@nestjs/common';
import { AuditEvent, AuditTrace } from './audit.interfaces';

@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];
  private readonly traces: AuditTrace[] = [];

  recordEvent(event: AuditEvent) {
    this.events.push(event);
  }

  recordTrace(trace: AuditTrace) {
    this.traces.push(trace);
  }

  getEvents(): AuditEvent[] {
    return this.events;
  }

  getTraces(): AuditTrace[] {
    return this.traces;
  }
}
