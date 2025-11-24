import { WavesController } from '../../src/modules/waves/waves.controller';
import { WavePickingStrategy } from '@prisma/client';

describe('WavesController', () => {
  let controller: WavesController;
  let service: any;
  let tenantContext: any;

  beforeEach(() => {
    service = {
      generateWaves: jest.fn(),
      releaseWave: jest.fn(),
    };
    tenantContext = { getTenantId: jest.fn().mockReturnValue('tenant-1') };
    controller = new WavesController(service as any, tenantContext as any);
  });

  it('delegates wave generation to service', async () => {
    const dto = { warehouseId: 'wh-1', strategy: WavePickingStrategy.BY_ROUTE } as any;
    await controller.generate(dto);
    expect(service.generateWaves).toHaveBeenCalledWith('tenant-1', dto);
  });

  it('releases a wave via service', async () => {
    await controller.release('wave-1');
    expect(service.releaseWave).toHaveBeenCalledWith('tenant-1', 'wave-1');
  });
});
