import { Process, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IntegrationJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Processor('integration-jobs-queue')
export class IntegrationsProcessor {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Process('integration-job')
  async handleIntegration(job: Job<{ tenantId: string; integrationJobId: string }>) {
    const record = await this.prisma.integrationJob.findFirst({
      where: { id: job.data.integrationJobId, tenantId: job.data.tenantId },
    });
    if (!record) {
      return;
    }

    await this.prisma.integrationJob.update({
      where: { id: record.id },
      data: { status: IntegrationJobStatus.RUNNING },
    });

    try {
      // TODO: invoke actual integration connector
      await this.prisma.integrationJob.update({
        where: { id: record.id },
        data: { status: IntegrationJobStatus.SUCCESS, lastError: null },
      });
      await this.audit.recordLog({
        tenantId: record.tenantId,
        userId: null,
        resource: 'INTEGRATION_JOB',
        action: 'PROCESS',
        entityId: record.id,
      });
    } catch (err) {
      await this.prisma.integrationJob.update({
        where: { id: record.id },
        data: { status: IntegrationJobStatus.FAILED, lastError: String(err) },
      });
    }
  }
}
