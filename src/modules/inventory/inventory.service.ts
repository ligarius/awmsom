import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface IncreaseStockParams {
  productId: string;
  batchId?: string;
  locationId: string;
  quantity: Prisma.Decimal;
  uom: string;
  stockStatus: StockStatus;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async increaseStock(params: IncreaseStockParams) {
    const location = await this.prisma.location.findUnique({ where: { id: params.locationId } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const existing = await this.prisma.inventory.findFirst({
      where: {
        productId: params.productId,
        batchId: params.batchId ?? null,
        locationId: params.locationId,
        uom: params.uom,
        stockStatus: params.stockStatus,
      },
    });

    if (existing) {
      return this.prisma.inventory.update({
        where: { id: existing.id },
        data: {
          quantity: new Prisma.Decimal(existing.quantity).plus(params.quantity),
        },
      });
    }

    return this.prisma.inventory.create({
      data: {
        productId: params.productId,
        batchId: params.batchId,
        locationId: params.locationId,
        quantity: params.quantity,
        uom: params.uom,
        stockStatus: params.stockStatus,
      },
    });
  }
}
