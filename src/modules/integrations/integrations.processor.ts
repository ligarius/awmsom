import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IntegrationJobStatus, IntegrationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ErpConnectorService } from '../integration/services/erp-connector.service';
import { TmsConnectorService } from '../integration/services/tms-connector.service';

@Processor('integration-jobs-queue')
export class IntegrationsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly erpConnector: ErpConnectorService,
    private readonly tmsConnector: TmsConnectorService,
  ) {
    super();
  }

  async process(job: Job<{ tenantId: string; integrationJobId: string }>) {
    if (job.name !== 'integration-job') {
      return;
    }
    const record = await this.prisma.integrationJob.findFirst({
      where: { id: job.data.integrationJobId, tenantId: job.data.tenantId },
      include: { integration: true },
    });
    if (!record) {
      return;
    }

    await this.prisma.integrationJob.update({
      where: { id: record.id },
      data: { status: IntegrationJobStatus.RUNNING },
    });

    try {
      const handler = this.resolveHandler(record.integration?.type, record.jobType);
      const result = await handler(record.payload);

      await this.prisma.integrationJob.update({
        where: { id: record.id },
        data: {
          status: IntegrationJobStatus.SUCCESS,
          lastError: null,
          payload: this.mergeOutcome(record.payload, { connectorResult: result }),
        },
      });

      await this.audit.recordLog({
        tenantId: record.tenantId,
        resource: 'INTEGRATION_JOB',
        action: 'PROCESS',
        entityId: record.id,
        metadata: { status: 'SUCCESS', jobType: record.jobType, result },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.integrationJob.update({
        where: { id: record.id },
        data: {
          status: IntegrationJobStatus.FAILED,
          lastError: message,
          payload: this.mergeOutcome(record.payload, { connectorError: message }),
        },
      });
      await this.audit.recordLog({
        tenantId: record.tenantId,
        resource: 'INTEGRATION_JOB',
        action: 'PROCESS',
        entityId: record.id,
        metadata: { status: 'FAILED', jobType: record.jobType, error: message },
      });
    }
  }

  private resolveHandler(type: IntegrationType | undefined, jobType: string) {
    if (!type) {
      throw new Error('Integration configuration missing');
    }

    if (type === IntegrationType.ERP && jobType === 'ERP_ORDER') {
      return (payload: any) => this.erpConnector.sendOrder(payload as any);
    }

    if (type === IntegrationType.TMS && jobType === 'TMS_SHIPMENT') {
      return (payload: any) => this.tmsConnector.notifyShipment(payload as any);
    }

    throw new Error(`No connector available for type ${type} and job ${jobType}`);
  }

  private mergeOutcome(originalPayload: any, outcome: Record<string, any>) {
    if (originalPayload && typeof originalPayload === 'object' && !Array.isArray(originalPayload)) {
      return { ...originalPayload, ...outcome };
    }
    return { originalPayload, ...outcome };
  }
}
