import { WarehouseApplicationService } from '../../src/modules/warehouses/application/services/warehouse.application-service';
import { WarehouseRepository } from '../../src/modules/warehouses/domain/repositories/warehouse.repository';
import { Warehouse } from '../../src/modules/warehouses/domain/entities/warehouse.entity';
import { WarehouseCodeAlreadyExistsError } from '../../src/modules/warehouses/application/exceptions/warehouse.exceptions';

class WarehouseRepositoryMock implements jest.Mocked<WarehouseRepository> {
  create = jest.fn();
  findById = jest.fn();
  findByCode = jest.fn();
  update = jest.fn();
  list = jest.fn();
  delete = jest.fn();
}

describe('WarehouseApplicationService', () => {
  let repository: WarehouseRepositoryMock;
  let service: WarehouseApplicationService;
  const existing = new Warehouse('wh-1', 'W1', 'Warehouse', true, new Date(), new Date());

  beforeEach(() => {
    repository = new WarehouseRepositoryMock();
    service = new WarehouseApplicationService(repository);
  });

  it('throws if updating code to one already used by another warehouse', async () => {
    repository.findById.mockResolvedValue(existing);
    repository.findByCode.mockResolvedValue({ ...existing, id: 'wh-2' });

    await expect(service.updateWarehouse('wh-1', { code: 'W2' })).rejects.toThrow(
      WarehouseCodeAlreadyExistsError,
    );

    expect(repository.findByCode).toHaveBeenCalledWith('W2');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates when code belongs to same warehouse', async () => {
    repository.findById.mockResolvedValue(existing);
    repository.findByCode.mockResolvedValue(existing);
    repository.update.mockResolvedValue({ ...existing, code: 'W1', name: 'Updated' });

    const result = await service.updateWarehouse('wh-1', { code: 'W1', name: 'Updated' });

    expect(repository.findByCode).toHaveBeenCalledWith('W1');
    expect(repository.update).toHaveBeenCalledWith('wh-1', { code: 'W1', name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});
