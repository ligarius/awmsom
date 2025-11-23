import { ExternalController } from '../src/modules/external/external.controller';

describe('ExternalController', () => {
  const inbound = { createReceipt: jest.fn() } as any;
  const outbound = { createOrder: jest.fn(), listShipments: jest.fn() } as any;
  const inventory = { listInventory: jest.fn() } as any;
  const audit = { recordLog: jest.fn() } as any;
  const tenantContext = { getTenantId: () => 't1' } as any;
  const controller = new ExternalController(inbound, outbound, inventory, audit, tenantContext);

  it('creates inbound receipt', async () => {
    inbound.createReceipt.mockResolvedValue({ id: 'r1' });
    const res = await controller.createInbound({});
    expect(res.id).toBe('r1');
    expect(audit.recordLog).toHaveBeenCalled();
  });
});
