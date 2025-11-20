import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { InboundReceipt } from '../../../domain/entities/inbound-receipt.entity';
import { InboundReceiptLine } from '../../../domain/entities/inbound-receipt-line.entity';
import { InboundReceiptRepository } from '../../../domain/repositories/inbound-receipt.repository';

@Injectable()
export class PrismaInboundReceiptRepository implements InboundReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(receipt: InboundReceipt): Promise<InboundReceipt> {
    const created = await this.prisma.inboundReceipt.create({
      data: {
        reference: receipt.reference,
        createdBy: receipt.createdBy,
        updatedBy: receipt.updatedBy,
        lines: {
          create: receipt.lines.map((line) => ({
            productId: line.productId,
            quantity: new Decimal(line.quantity),
            uom: line.uom,
            batchCode: line.batchCode,
            expiryDate: line.expiryDate,
            createdBy: line.createdBy ?? receipt.createdBy,
            updatedBy: line.updatedBy ?? receipt.updatedBy,
          })),
        },
      },
      include: { lines: true },
    });

    return new InboundReceipt(
      created.reference ?? undefined,
      created.lines.map((line: any) =>
        new InboundReceiptLine(
          line.productId,
          Number(line.quantity),
          line.uom,
          line.batchCode ?? undefined,
          line.expiryDate ?? undefined,
          line.id,
          line.createdAt,
          line.updatedAt,
          line.createdBy ?? undefined,
          line.updatedBy ?? undefined,
        ),
      ),
      created.id,
      created.createdAt,
      created.updatedAt,
      created.createdBy ?? undefined,
      created.updatedBy ?? undefined,
    );
  }

  async findEarliestExpiry(productId: string): Promise<Date | null> {
    const line = await this.prisma.inboundReceiptLine.findFirst({
      where: { productId, expiryDate: { not: null } },
      orderBy: { expiryDate: 'asc' },
    });
    return line?.expiryDate ?? null;
  }
}
