import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PutawayMovement } from '../../domain/entities/putaway-movement.entity';
import { PutawayMovementRepository } from '../../domain/repositories/putaway-movement.repository';

@Injectable()
export class PrismaPutawayMovementRepository implements PutawayMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(movement: PutawayMovement): Promise<PutawayMovement> {
    const created = await this.prisma.movementHeader.create({
      data: {
        reference: 'PUTAWAY',
        lines: {
          create: {
            productId: movement.productId,
            fromLocationId: movement.fromLocationId,
            toLocationId: movement.toLocationId,
            quantity: new Prisma.Decimal(movement.quantity),
            uom: movement.uom,
          },
        },
      },
      include: { lines: true },
    });

    const line = created.lines[0];
    return new PutawayMovement(
      line.productId,
      Number(line.quantity),
      line.uom,
      line.toLocationId ?? '',
      line.fromLocationId ?? undefined,
      movement.batchCode,
      movement.expiryDate,
      line.id,
    );
  }
}
