import { Prisma } from '@prisma/client';
import { WavesService } from '../../src/modules/waves/waves.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('WavesService', () => {
  let prisma: any;
  let auditService: any;
  let cacheService: any;
  let service: WavesService;

  beforeEach(() => {
    prisma = {
      outboundOrder: { findMany: jest.fn() },
      wave: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      waveOrder: { createMany: jest.fn() },
      pickingTask: { create: jest.fn() },
      pickingTaskLine: { create: jest.fn() },
      inventory: { findMany: jest.fn() },
      wavePickingPath: { upsert: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    } as any;

    auditService = { recordLog: jest.fn() } as any;
    cacheService = { getJson: jest.fn(), setJson: jest.fn(), buildKey: jest.fn() } as any;
    service = new WavesService(prisma, auditService, cacheService);
  });

  it('splits waves according to maxOrdersPerWave', async () => {
    const orders = Array.from({ length: 5 }).map((_, idx) => ({
      id: `order-${idx}`,
      warehouseId: 'wh-1',
      tenantId: 'tenant-1',
      routeCode: 'R1',
      carrierCode: 'C1',
      zoneCode: 'Z1',
      requestedShipDate: new Date('2024-01-01T10:00:00Z'),
      priority: 1,
      lines: [
        { id: `line-${idx}-1`, requestedQty: decimal(1) },
        { id: `line-${idx}-2`, requestedQty: decimal(2) },
      ],
    }));

    let waveCounter = 0;
    (prisma.outboundOrder.findMany as jest.Mock).mockResolvedValue(orders);
    (prisma.wave.create as jest.Mock).mockImplementation(async ({ data }: any) => ({ ...data, id: `wave-${++waveCounter}` }));
    (prisma.wave.update as jest.Mock).mockImplementation(async ({ where }: any) => ({ id: where.id }));

    const waves = await service.generateWaves('tenant-1', {
      warehouseId: 'wh-1',
      strategy: 'BY_ROUTE' as any,
      maxOrdersPerWave: 2,
    });

    expect(waves).toHaveLength(3);
    expect(prisma.wave.create).toHaveBeenCalledTimes(3);
    expect(prisma.waveOrder.createMany).toHaveBeenCalled();
    expect(auditService.recordLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'GENERATE' }));
  });

  it('updates wave statuses through lifecycle', async () => {
    (prisma.wave.update as jest.Mock).mockResolvedValue({ id: 'wave-1' });

    await service.releaseWave('tenant-1', 'wave-1');
    await service.startWave('tenant-1', 'wave-1');
    await service.completeWave('tenant-1', 'wave-1');

    expect(prisma.wave.update).toHaveBeenCalledTimes(3);
    expect(auditService.recordLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'RELEASE' }));
  });

  it('creates consolidated picking tasks for a wave', async () => {
    prisma.wave.findFirst.mockResolvedValue({
      id: 'wave-1',
      warehouseId: 'wh-1',
      waveOrders: [
        {
          outboundOrderId: 'order-1',
          outboundOrder: {
            lines: [
              { id: 'line-1', productId: 'prod-1' },
              { id: 'line-2', productId: 'prod-1' },
            ],
          },
        },
      ],
    });

    prisma.inventory.findMany.mockResolvedValue([
      { productId: 'prod-1', batchId: null, quantity: decimal(1), locationId: 'loc-1', uom: 'EA' },
      { productId: 'prod-1', batchId: null, quantity: decimal(2), locationId: 'loc-1', uom: 'EA' },
    ]);

    prisma.pickingTask.create.mockResolvedValue({ id: 'task-1' });

    await service.createPickingTasksForWave('tenant-1', 'wave-1');

    expect(prisma.pickingTask.create).toHaveBeenCalled();
    expect(prisma.pickingTaskLine.create).toHaveBeenCalledTimes(1);
    const linePayload = (prisma.pickingTaskLine.create as jest.Mock).mock.calls[0][0].data;
    expect(linePayload.fromLocationId).toBe('loc-1');
    expect(linePayload.quantityToPick).toBeDefined();
  });

  it('builds a picking path for a wave', async () => {
    prisma.wave.findFirst.mockResolvedValue({
      id: 'wave-1',
      tenantId: 'tenant-1',
      pickerUserId: 'picker-1',
      pickingTasks: [
        {
          lines: [
            { id: 'l1', fromLocationId: 'loc-1', fromLocation: { aisle: '1', row: '1', level: '1' } },
            { id: 'l2', fromLocationId: 'loc-2', fromLocation: { aisle: '2', row: '1', level: '1' } },
          ],
        },
      ],
      pickerUser: { id: 'picker-1' },
    });

    prisma.wavePickingPath.upsert.mockResolvedValue({ id: 'path-1', pathJson: [] });

    const result = await service.generatePickingPathForWave('tenant-1', 'wave-1');

    expect(result.id).toBe('path-1');
    expect(prisma.wavePickingPath.upsert).toHaveBeenCalled();
    expect(auditService.recordLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'GENERATE_PATH' }));
  });
});
