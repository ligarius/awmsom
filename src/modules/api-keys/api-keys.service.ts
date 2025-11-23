import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
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

  async createApiKey(tenantId: string, userId: string | null, dto: CreateApiKeyDto) {
    const key = this.generateApiKey();
    const prisma = this.prisma as any;
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        key,
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

    return apiKey;
  }

  listApiKeys(tenantId: string) {
    const prisma = this.prisma as any;
    return prisma.apiKey.findMany({ where: { tenantId } });
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
    return apiKey;
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
    return updated;
  }

  async validateApiKey(rawKey: string) {
    const prisma = this.prisma as any;
    const apiKey = await prisma.apiKey.findFirst({ where: { key: rawKey, isActive: true } });
    if (!apiKey) {
      return null;
    }
    return { tenantId: apiKey.tenantId, apiKey };
  }
}
