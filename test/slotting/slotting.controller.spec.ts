import { SlottingController } from '../../src/modules/slotting/slotting.controller';

describe('SlottingController', () => {
  const service: any = {
    createConfig: jest.fn(),
    updateConfig: jest.fn(),
    listConfigs: jest.fn(),
    calculateSlotting: jest.fn(),
    listRecommendations: jest.fn(),
    approveRecommendation: jest.fn(),
  };
  const tenantContext = { getTenantId: () => 'tenant-1' } as any;
  const controller = new SlottingController(service, tenantContext);

  it('creates config', async () => {
    service.createConfig.mockResolvedValue({ id: 'cfg1' });
    const res = await controller.createConfig({ warehouseId: 'wh-1', abcPeriodDays: 30, xyzPeriodDays: 30 } as any);
    expect(res.id).toBe('cfg1');
    expect(service.createConfig).toHaveBeenCalled();
  });

  it('calculates slotting', async () => {
    service.calculateSlotting.mockResolvedValue([{ id: 'rec1' }]);
    const res = await controller.calculate({ warehouseId: 'wh-1' } as any);
    expect(res[0].id).toBe('rec1');
    expect(service.calculateSlotting).toHaveBeenCalled();
  });
});
