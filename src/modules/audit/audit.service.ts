import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogInput } from './audit.interfaces';
import { PaginationService } from '../../common/pagination/pagination.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly events: any[] = [];
  private readonly traces: any[] = [];
  private readonly encryptionKey: Buffer | null;
  private readonly retentionDays: number;

  constructor(private readonly prisma: PrismaService, private readonly pagination: PaginationService) {
    this.encryptionKey = this.loadEncryptionKey();
    this.retentionDays = this.loadRetentionDays();
  }

  async recordLog(entry: AuditLogInput) {
    try {
      const encryptedPayload = this.encryptMetadata(entry.metadata);
      const expiresAt = this.calculateExpiry();
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          resource: entry.resource,
          action: entry.action,
          entityId: entry.entityId,
          encryptedPayload,
          expiresAt,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist audit log: ${String(error)}`);
    }
  }

  async getLogs(tenantId: string, page = 1, limit = 100) {
    const { skip, take } = this.pagination.buildPaginationParams(page, limit);
    const now = new Date();
    const rows = await this.prisma.auditLog.findMany({
      where: { tenantId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return rows.map(({ encryptedPayload, ...log }) => ({
      ...log,
      metadata: this.decryptPayload(encryptedPayload),
    }));
  }

  recordEvent(event: any) {
    this.events.push(event);
  }

  recordTrace(trace: any) {
    this.traces.push(trace);
  }

  getEvents() {
    return this.events;
  }

  getTraces() {
    return this.traces;
  }

  private loadEncryptionKey(): Buffer | null {
    const rawKey = process.env.AUDIT_LOG_ENCRYPTION_KEY;
    if (!rawKey) {
      this.logger.warn('AUDIT_LOG_ENCRYPTION_KEY is not configured; audit metadata will not be stored.');
      return null;
    }
    try {
      const key = Buffer.from(rawKey, 'base64');
      if (key.length !== 32) {
        this.logger.warn('AUDIT_LOG_ENCRYPTION_KEY must be a base64 encoded 32-byte key (AES-256).');
        return null;
      }
      return key;
    } catch (error) {
      this.logger.warn(`Failed to parse AUDIT_LOG_ENCRYPTION_KEY: ${String(error)}`);
      return null;
    }
  }

  private loadRetentionDays(): number {
    const fallback = 365;
    const parsed = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? fallback);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    this.logger.warn('AUDIT_LOG_RETENTION_DAYS is invalid or missing, defaulting to 365 days.');
    return fallback;
  }

  private calculateExpiry(): Date | null {
    if (!this.retentionDays) {
      return null;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.retentionDays);
    return expiresAt;
  }

  private encryptMetadata(metadata: unknown): string | undefined {
    if (!metadata) {
      return undefined;
    }
    if (!this.encryptionKey) {
      return undefined;
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const serialized = Buffer.from(JSON.stringify(metadata), 'utf8');
    const encrypted = Buffer.concat([cipher.update(serialized), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decryptPayload(encryptedPayload?: string | null): Prisma.JsonValue | undefined {
    if (!encryptedPayload) {
      return undefined;
    }
    if (!this.encryptionKey) {
      this.logger.warn('Cannot decrypt audit log metadata because encryption key is not available.');
      return undefined;
    }
    try {
      const payloadBuffer = Buffer.from(encryptedPayload, 'base64');
      const iv = payloadBuffer.subarray(0, 12);
      const authTag = payloadBuffer.subarray(12, 28);
      const ciphertext = payloadBuffer.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8')) as Prisma.JsonValue;
    } catch (error) {
      this.logger.warn(`Failed to decrypt audit log metadata: ${String(error)}`);
      return undefined;
    }
  }
}
