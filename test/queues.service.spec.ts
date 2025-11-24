import { QueuesService } from '../src/infrastructure/queues/queues.service';
import { Queue } from 'bullmq';

describe('QueuesService', () => {
  let service: QueuesService;
  const queueFactory = () => ({ add: jest.fn() }) as unknown as Queue;

  beforeEach(() => {
    service = new QueuesService(queueFactory(), queueFactory(), queueFactory(), queueFactory(), queueFactory());
  });

  it('enqueues KPI snapshot jobs', async () => {
    const spy = jest.spyOn((service as any).kpiSnapshotQueue, 'add');
    await service.enqueueKpiSnapshotJob('tenant-1', { foo: 'bar' });
    expect(spy).toHaveBeenCalledWith('kpi-snapshot', { tenantId: 'tenant-1', foo: 'bar' });
  });

  it('enqueues inventory snapshot jobs', async () => {
    const spy = jest.spyOn((service as any).inventorySnapshotQueue, 'add');
    await service.enqueueInventorySnapshotJob('tenant-1', { snapshotDate: '2023-01-01' });
    expect(spy).toHaveBeenCalledWith('inventory-snapshot', { tenantId: 'tenant-1', snapshotDate: '2023-01-01' });
  });

  it('enqueues integration jobs', async () => {
    const spy = jest.spyOn((service as any).integrationJobsQueue, 'add');
    await service.enqueueIntegrationJob('tenant-1', 'job-1');
    expect(spy).toHaveBeenCalledWith('integration-job', { tenantId: 'tenant-1', integrationJobId: 'job-1' });
  });

  it('enqueues maintenance jobs', async () => {
    const spy = jest.spyOn((service as any).maintenanceQueue, 'add');
    await service.enqueueMaintenanceJob('tenant-1', { action: 'clean' });
    expect(spy).toHaveBeenCalledWith('maintenance', { tenantId: 'tenant-1', action: 'clean' });
  });

  it('enqueues replenishment jobs', async () => {
    const spy = jest.spyOn((service as any).replenishmentQueue, 'add');
    await service.enqueueReplenishmentJob('tenant-1', {});
    expect(spy).toHaveBeenCalledWith('evaluate', { tenantId: 'tenant-1' });
  });
});
