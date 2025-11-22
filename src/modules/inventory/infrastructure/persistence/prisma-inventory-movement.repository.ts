import { Injectable, NotFoundException } from '@nestjs/common';
import { MovementStatus, MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InventoryMovement } from '../../domain/entities/inventory-movement.entity';
import { INVENTORY_MOVEMENT_REPOSITORY, InventoryMovementRepository } from '../../domain/repositories/inventory-movement.repository';

@Injectable()
export class PrismaInventoryMovementRepository implements InventoryMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async log(movement: InventoryMovement): Promise<InventoryMovement> {
    const fromLocation = await this.prisma.location.findUnique({ where: { id: movement.fromLocationId } });
    if (!fromLocation) {
      throw new NotFoundException('Origen de inventario no encontrado');
    }

    const batchId = movement.lotCode
      ? await this.getBatchId(movement.productId, movement.lotCode)
      : null;

    const header = await this.prisma.movementHeader.create({
      data: {
        movementType: MovementType.INTERNAL_TRANSFER,
        warehouseId: fromLocation.warehouseId,
        status: MovementStatus.COMPLETED,
        createdBy: movement.createdBy,
        lines: {
          create: {
            productId: movement.productId,
            batchId,
            fromLocationId: movement.fromLocationId,
            toLocationId: movement.toLocationId,
            quantity: new Prisma.Decimal(movement.quantity),
            uom: movement.uom,
          },
        },
      },
      include: { lines: true },
    });

    const line = header.lines[0];

    return new InventoryMovement(
      line.productId,
      new Prisma.Decimal(line.quantity).toNumber(),
      line.uom,
      line.fromLocationId!,
      line.toLocationId!,
      movement.lotCode,
      header.createdAt,
      movement.createdBy,
      movement.reason,
      line.id,
    );
  }

  private async getBatchId(productId: string, batchCode: string): Promise<string | null> {
    const batch = await this.prisma.batch.findFirst({ where: { productId, batchCode } });
    if (!batch) {
      throw new NotFoundException('Lote no encontrado para el movimiento');
    }

    return batch.id;
  }
}
