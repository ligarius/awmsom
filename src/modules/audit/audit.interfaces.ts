export interface AuditLogInput {
  tenantId: string;
  userId?: string;
  resource: string;
  action: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}
