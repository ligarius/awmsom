import { BadRequestException } from '@nestjs/common';
import { ConfigController } from '../config.controller';

describe('ConfigController', () => {
  const tenantContext = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as any;
  const configService = {
    getTenantConfig: jest.fn(),
    updateTenantConfig: jest.fn(),
    getPickingMethods: jest.fn(),
    upsertPickingMethod: jest.fn(),
    getWarehouseZones: jest.fn(),
    upsertWarehouseZone: jest.fn(),
    getInventoryPolicies: jest.fn(),
    upsertInventoryPolicy: jest.fn(),
    getOutboundRule: jest.fn(),
    upsertOutboundRule: jest.fn(),
  } as any;

  let controller: ConfigController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ConfigController(configService, tenantContext);
  });

  it('retrieves tenant config using tenant context', async () => {
    const config = { tenantId: 'tenant-1' };
    configService.getTenantConfig.mockResolvedValue(config);

    const result = await controller.getTenantConfig();
    expect(result).toBe(config);
    expect(configService.getTenantConfig).toHaveBeenCalledWith('tenant-1');
  });

  it('throws when zones endpoint is missing warehouseId', () => {
    expect(() => controller.getZones(undefined as any)).toThrow(BadRequestException);
  });

  it('upserts outbound rule without exposing tenantId in payload', async () => {
    const dto = { allowPartialShipments: false } as any;
    configService.upsertOutboundRule.mockResolvedValue({ id: 'rule-1', ...dto });

    const response = await controller.upsertOutboundRule(dto);
    expect(response.id).toBe('rule-1');
    expect(configService.upsertOutboundRule).toHaveBeenCalledWith('tenant-1', dto);
  });
});
