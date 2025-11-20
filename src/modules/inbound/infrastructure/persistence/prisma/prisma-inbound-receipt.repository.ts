import { Injectable } from '@nestjs/common';
import { Prisma, InboundReceiptLine as PrismaReceiptLine } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InboundReceipt } from '../../domain/entities/inbound-receipt.entity';
import { InboundReceiptLine } from '../../domain/entities/inbound-receipt-line.entity';
import { InboundReceiptRepository } from '../../domain/repositories/inbound-receipt.repository';

@Injectable()
export class PrismaInboundReceiptRepository implements InboundReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(receipt: InboundReceipt): Promise<InboundReceipt> {
    const created = await this.prisma.inboundReceipt.create({
      data: {
        reference: receipt.reference,
        lines: {
          create: receipt.lines.map((line) => ({
            productId: line.productId,
            quantity: new Prisma.Decimal(line.quantity),
            uom: line.uom,
            batchCode: line.batchCode,
            expiryDate: line.expiryDate,
          })),
        },
      },
      include: { lines: true },
    });

    return new InboundReceipt(
      created.reference ?? undefined,
      created.lines.map((line: PrismaReceiptLine) =>
        new InboundReceiptLine(
          line.productId,
          Number(line.quantity),
          line.uom,
          line.batchCode ?? undefined,
          line.expiryDate ?? undefined,
        ),
      ),
      created.id,
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
