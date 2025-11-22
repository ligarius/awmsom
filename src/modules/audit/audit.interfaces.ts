export interface AuditEvent {
  timestamp: string;
  method: string;
  path: string;
  details?: Record<string, unknown>;
}

export interface AuditTrace extends AuditEvent {
  statusCode: number;
  durationMs: number;
}
