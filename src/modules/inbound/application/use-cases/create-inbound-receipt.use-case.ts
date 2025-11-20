import { Inject, Injectable } from '@nestjs/common';
import { InboundReceipt } from '../../domain/entities/inbound-receipt.entity';
import { InboundReceiptLine } from '../../domain/entities/inbound-receipt-line.entity';
import { InboundReceiptRepository, INBOUND_RECEIPT_REPOSITORY } from '../../domain/repositories/inbound-receipt.repository';
import { ProductRepository, PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';

@Injectable()
export class CreateInboundReceiptUseCase {
  constructor(
    @Inject(INBOUND_RECEIPT_REPOSITORY)
    private readonly receiptRepo: InboundReceiptRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: {
    reference?: string;
    lines: {
      productId: string;
      quantity: number;
      uom?: string;
      batchCode?: string;
      expiryDate?: Date;
    }[];
  }): Promise<InboundReceipt> {
    const lines = await Promise.all(
      input.lines.map(async (line) => {
        const product = await this.productRepo.findById(line.productId);
        if (!product) {
          throw new Error(`Producto ${line.productId} no encontrado`);
        }

        const uom = line.uom || product.defaultUom;

        if (product.requiresBatch && !line.batchCode) {
          throw new Error('El producto requiere lote');
        }

        if (product.requiresExpiryDate && !line.expiryDate) {
          throw new Error('El producto requiere fecha de caducidad');
        }

        return new InboundReceiptLine(
          line.productId,
          line.quantity,
          uom,
          line.batchCode,
          line.expiryDate,
        );
      }),
    );

    const receipt = new InboundReceipt(input.reference, lines);
    return this.receiptRepo.create(receipt);
  }
}
