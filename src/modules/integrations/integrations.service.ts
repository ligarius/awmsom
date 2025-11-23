import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  createIntegrationConfig(tenantId: string, dto: CreateIntegrationConfigDto) {
    return this.prisma.integrationConfig.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async updateIntegrationConfig(tenantId: string, id: string, dto: UpdateIntegrationConfigDto) {
    const existing = await this.prisma.integrationConfig.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Integration not found');
    }
    const updated = await this.prisma.integrationConfig.update({ where: { id }, data: dto });
    await this.audit.recordLog({ tenantId, userId: null, resource: 'INTEGRATION', action: 'UPDATE', entityId: id });
    return updated;
  }

  listIntegrations(tenantId: string, type?: any) {
    return this.prisma.integrationConfig.findMany({ where: { tenantId, type } });
  }

  async getIntegration(tenantId: string, id: string) {
    const integration = await this.prisma.integrationConfig.findFirst({ where: { id, tenantId } });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    return integration;
  }

  queueJob(tenantId: string, integrationId: string | null, jobType: string, payload: any) {
    return this.prisma.integrationJob.create({
      data: { tenantId, integrationId, jobType, payload, status: IntegrationJobStatus.PENDING },
    });
  }

  async processJob(jobId: string) {
    const job = await this.prisma.integrationJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    await this.prisma.integrationJob.update({ where: { id: jobId }, data: { status: IntegrationJobStatus.RUNNING } });
    try {
      await this.prisma.integrationJob.update({ where: { id: jobId }, data: { status: IntegrationJobStatus.SUCCESS } });
      await this.audit.recordLog({
        tenantId: job.tenantId,
        userId: null,
        resource: 'INTEGRATION_JOB',
        action: 'PROCESS',
        entityId: job.id,
      });
    } catch (error) {
      await this.prisma.integrationJob.update({
        where: { id: jobId },
        data: { status: IntegrationJobStatus.FAILED, lastError: String(error) },
      });
      throw error;
    }
  }
}
