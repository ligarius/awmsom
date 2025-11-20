import { InventoryMovement } from '../entities/inventory-movement.entity';

export const INVENTORY_MOVEMENT_REPOSITORY = Symbol('INVENTORY_MOVEMENT_REPOSITORY');

export interface InventoryMovementRepository {
  log(movement: InventoryMovement): Promise<InventoryMovement>;
}
