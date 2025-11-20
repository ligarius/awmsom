import { RegisterInventoryMovementUseCase } from '../../src/modules/inventory/application/use-cases/register-inventory-movement.use-case';
import { InventoryMovement } from '../../src/modules/inventory/domain/entities/inventory-movement.entity';
import { InventoryMovementRepository } from '../../src/modules/inventory/domain/repositories/inventory-movement.repository';
import { fixtures } from './fixtures/inventory.fixtures';

describe('Given a movement request when registering', () => {
  const movementRepo: InventoryMovementRepository = {
    log: jest.fn(async (movement) => movement),
  };

  it('then it enforces traceability metadata', async () => {
    const useCase = new RegisterInventoryMovementUseCase(movementRepo);

    const result = await useCase.execute({
      productId: fixtures.movement.productId,
      quantity: fixtures.movement.quantity,
      uom: fixtures.movement.uom,
      fromLocationId: fixtures.movement.fromLocationId,
      toLocationId: fixtures.movement.toLocationId,
      lotCode: fixtures.movement.lotCode,
      createdBy: 'auditor',
      reason: 'cycle-count',
    });

    expect(result).toBeInstanceOf(InventoryMovement);
    expect(result.createdBy).toBe('auditor');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(movementRepo.log).toHaveBeenCalledWith(expect.any(InventoryMovement));
  });

  it('then it rejects missing audit user', async () => {
    const useCase = new RegisterInventoryMovementUseCase(movementRepo);

    await expect(
      useCase.execute({
        productId: fixtures.movement.productId,
        quantity: fixtures.movement.quantity,
        uom: fixtures.movement.uom,
        fromLocationId: fixtures.movement.fromLocationId,
        toLocationId: fixtures.movement.toLocationId,
        lotCode: fixtures.movement.lotCode,
      } as any),
    ).rejects.toThrow('Los movimientos deben ser trazables con usuario');
  });
});
