import { IntegrationJobStatus, IntegrationType } from '@prisma/client';
import { IntegrationsProcessor } from '../src/modules/integrations/integrations.processor';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ErpConnectorService } from '../src/modules/integration/services/erp-connector.service';
import { TmsConnectorService } from '../src/modules/integration/services/tms-connector.service';

jest.mock('@nestjs/bullmq', () => ({
  Process: () => () => undefined,
  Processor: () => () => undefined,
}));

const buildJob = () => ({
  data: { tenantId: 'tenant-1', integrationJobId: 'job-1' },
});

describe('IntegrationsProcessor', () => {
  let prisma: jest.Mocked<PrismaService>;
  let audit: jest.Mocked<AuditService>;
  let erpConnector: jest.Mocked<ErpConnectorService>;
  let tmsConnector: jest.Mocked<TmsConnectorService>;
  let processor: IntegrationsProcessor;

  beforeEach(() => {
    prisma = {
      integrationJob: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    audit = {
      recordLog: jest.fn(),
    } as any;

    erpConnector = {
      sendOrder: jest.fn(),
    } as any;

    tmsConnector = {
      notifyShipment: jest.fn(),
    } as any;

    processor = new IntegrationsProcessor(prisma, audit, erpConnector, tmsConnector);
  });

  it('processes integration jobs successfully with the matching connector', async () => {
    const job = buildJob();
    const record: any = {
      id: 'job-1',
      tenantId: 'tenant-1',
      jobType: 'ERP_ORDER',
      payload: { orderId: 'SO-1' },
      integration: { type: IntegrationType.ERP },
    };

    prisma.integrationJob.findFirst.mockResolvedValue(record);
    erpConnector.sendOrder.mockResolvedValue({ delivered: true });

    await processor.handleIntegration(job as any);

    expect(prisma.integrationJob.update).toHaveBeenNthCalledWith(1, {
      where: { id: record.id },
      data: { status: IntegrationJobStatus.RUNNING },
    });

    expect(prisma.integrationJob.update).toHaveBeenNthCalledWith(2, {
      where: { id: record.id },
      data: {
        status: IntegrationJobStatus.SUCCESS,
        lastError: null,
        payload: { orderId: 'SO-1', connectorResult: { delivered: true } },
      },
    });

    expect(audit.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'PROCESS',
        metadata: expect.objectContaining({ status: 'SUCCESS', jobType: record.jobType, result: { delivered: true } }),
      }),
    );
  });

  it('marks jobs as failed when the connector throws and logs the error', async () => {
    const job = buildJob();
    const record: any = {
      id: 'job-2',
      tenantId: 'tenant-1',
      jobType: 'TMS_SHIPMENT',
      payload: { trackingCode: 'TRK-1' },
      integration: { type: IntegrationType.TMS },
    };

    prisma.integrationJob.findFirst.mockResolvedValue(record);
    tmsConnector.notifyShipment.mockRejectedValue(new Error('connector down'));

    await processor.handleIntegration(job as any);

    expect(prisma.integrationJob.update).toHaveBeenNthCalledWith(1, {
      where: { id: record.id },
      data: { status: IntegrationJobStatus.RUNNING },
    });

    expect(prisma.integrationJob.update).toHaveBeenNthCalledWith(2, {
      where: { id: record.id },
      data: {
        status: IntegrationJobStatus.FAILED,
        lastError: 'connector down',
        payload: { trackingCode: 'TRK-1', connectorError: 'connector down' },
      },
    });

    expect(audit.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        metadata: expect.objectContaining({ status: 'FAILED', jobType: record.jobType, error: 'connector down' }),
      }),
    );
  });
});
