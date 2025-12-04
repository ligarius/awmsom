import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { genSalt, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private generateApiKey(): string {
    return randomBytes(24).toString('hex');
  }

  private async hashApiKey(key: string, salt?: string): Promise<string> {
    if (salt) {
      return hash(key, salt);
    }
    const generatedSalt = await genSalt(12);
    return hash(key, generatedSalt);
  }

  private constantTimeMatch(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
  }

  private sanitizeApiKey<T extends { keyHash?: string }>(apiKey: T) {
    const { keyHash, ...rest } = apiKey;
    return rest;
  }

  async createApiKey(tenantId: string, userId: string | null, dto: CreateApiKeyDto) {
    const key = this.generateApiKey();
    const keyHash = await this.hashApiKey(key);
    const prisma = this.prisma as any;
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyHash,
        canRead: dto.canRead ?? true,
        canWrite: dto.canWrite ?? false,
      },
    });

    await this.audit.recordLog({
      tenantId,
      userId: userId ?? undefined,
      resource: 'API_KEY',
      action: 'CREATE',
      entityId: apiKey.id,
      metadata: { name: apiKey.name },
    });

    return { ...this.sanitizeApiKey(apiKey), key };
  }

  listApiKeys(tenantId: string) {
    const prisma = this.prisma as any;
    return prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        isActive: true,
        canRead: true,
        canWrite: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  }

  async updateApiKey(tenantId: string, id: string, dto: UpdateApiKeyDto) {
    const prisma = this.prisma as any;
    const existing = await prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }
    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        isActive: dto.isActive ?? existing.isActive,
        canRead: dto.canRead ?? existing.canRead,
        canWrite: dto.canWrite ?? existing.canWrite,
      },
    });
    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'API_KEY',
      action: 'UPDATE',
      entityId: id,
      metadata: dto,
    });
    return this.sanitizeApiKey(apiKey);
  }

  async revokeApiKey(tenantId: string, id: string) {
    const prisma = this.prisma as any;
    const apiKey = await prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    const updated = await prisma.apiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });
    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'API_KEY',
      action: 'REVOKE',
      entityId: id,
    });
    return this.sanitizeApiKey(updated);
  }

  async validateApiKey(rawKey: string) {
    const prisma = this.prisma as any;
    const apiKeys = await prisma.apiKey.findMany({ where: { isActive: true } });
    for (const apiKey of apiKeys) {
      const hashedInput = await this.hashApiKey(rawKey, apiKey.keyHash);
      const matches = this.constantTimeMatch(hashedInput, apiKey.keyHash);
      if (matches) {
        return { tenantId: apiKey.tenantId, apiKey: this.sanitizeApiKey(apiKey) };
      }
    }
    return null;
  }
}
