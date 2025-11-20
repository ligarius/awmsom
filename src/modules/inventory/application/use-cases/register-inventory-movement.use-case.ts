import { Inject, Injectable } from '@nestjs/common';
import { INVENTORY_MOVEMENT_REPOSITORY, InventoryMovementRepository } from '../../domain/repositories/inventory-movement.repository';
import { InventoryMovement } from '../../domain/entities/inventory-movement.entity';

@Injectable()
export class RegisterInventoryMovementUseCase {
  constructor(
    @Inject(INVENTORY_MOVEMENT_REPOSITORY)
    private readonly movementRepo: InventoryMovementRepository,
  ) {}

  async execute(input: {
    productId: string;
    quantity: number;
    uom: string;
    fromLocationId: string;
    toLocationId: string;
    lotCode?: string;
    createdBy: string;
    reason?: string;
    createdAt?: Date;
  }): Promise<InventoryMovement> {
    const timestamped = new InventoryMovement(
      input.productId,
      input.quantity,
      input.uom,
      input.fromLocationId,
      input.toLocationId,
      input.lotCode,
      input.createdAt,
      input.createdBy,
      input.reason,
    );

    const movement = timestamped.createdAt ? timestamped : timestamped.withTimestamp(new Date());
    return this.movementRepo.log(movement);
  }
}
