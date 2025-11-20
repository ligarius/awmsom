import { Inject, Injectable } from '@nestjs/common';
import { PutawayMovement } from '../../domain/entities/putaway-movement.entity';
import { InboundReceiptRepository, INBOUND_RECEIPT_REPOSITORY } from '../../domain/repositories/inbound-receipt.repository';
import { ProductRepository, PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';
import { PutawayMovementRepository, PUTAWAY_MOVEMENT_REPOSITORY } from '../../domain/repositories/putaway-movement.repository';

@Injectable()
export class RegisterPutawayUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(INBOUND_RECEIPT_REPOSITORY)
    private readonly receiptRepo: InboundReceiptRepository,
    @Inject(PUTAWAY_MOVEMENT_REPOSITORY)
    private readonly movementRepo: PutawayMovementRepository,
  ) {}

  async execute(input: {
    productId: string;
    quantity: number;
    uom?: string;
    toLocationId: string;
    fromLocationId?: string;
    batchCode?: string;
    expiryDate?: Date;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<PutawayMovement> {
    const product = await this.productRepo.findById(input.productId);
    if (!product) {
      throw new Error(`Producto ${input.productId} no encontrado`);
    }

    const uom = input.uom || product.defaultUom;

    if (product.requiresBatch && !input.batchCode) {
      throw new Error('El producto requiere lote');
    }

    if (product.requiresExpiryDate && !input.expiryDate) {
      throw new Error('El producto requiere fecha de caducidad');
    }

    const earliestExpiry = await this.receiptRepo.findEarliestExpiry(input.productId);
    if (earliestExpiry && input.expiryDate && input.expiryDate > earliestExpiry) {
      throw new Error('Debe ubicarse primero el lote con caducidad más próxima (FEFO)');
    }

    const movement = new PutawayMovement(
      input.productId,
      input.quantity,
      uom,
      input.toLocationId,
      input.fromLocationId,
      input.batchCode,
      input.expiryDate,
      undefined,
      undefined,
      undefined,
      input.createdBy,
      input.updatedBy,
    );

    return this.movementRepo.create(movement);
  }
}
