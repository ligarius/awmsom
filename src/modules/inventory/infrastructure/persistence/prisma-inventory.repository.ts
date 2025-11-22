import { Injectable } from '@nestjs/common';
import { Prisma, StockStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StockItem } from '../../domain/entities/stock-item.entity';
import { StockState } from '../../domain/enums/stock-state.enum';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductLotAndLocation(
    productId: string,
    lotCode: string | undefined,
    locationId: string,
    stockState?: StockState,
  ): Promise<StockItem | null> {
    const record = await this.prisma.inventory.findFirst({
      where: {
        productId,
        locationId,
        ...(stockState ? { stockStatus: this.mapStockState(stockState) } : {}),
        ...(lotCode ? { batch: { batchCode: lotCode } } : { batchId: null }),
      },
      include: { batch: true },
    });

    return record ? this.toDomain(record) : null;
  }

  async save(stock: StockItem): Promise<StockItem> {
    const batchId = await this.resolveBatchId(stock.productId, stock.lotCode, stock.expirationDate);

    if (stock.id) {
      const record = await this.prisma.inventory.update({
        where: { id: stock.id },
        data: {
          quantity: new Prisma.Decimal(stock.quantity),
          uom: stock.uom,
          locationId: stock.locationId,
          stockStatus: this.mapStockState(stock.stockState),
          batchId,
          updatedBy: stock.updatedBy,
        },
        include: { batch: true },
      });

      return this.toDomain(record);
    }

    const record = await this.prisma.inventory.create({
      data: {
        productId: stock.productId,
        quantity: new Prisma.Decimal(stock.quantity),
        uom: stock.uom,
        locationId: stock.locationId,
        stockStatus: this.mapStockState(stock.stockState),
        batchId,
        createdBy: stock.createdBy,
        updatedBy: stock.updatedBy,
      },
      include: { batch: true },
    });

    return this.toDomain(record);
  }

  async listAvailableLots(productId: string): Promise<StockItem[]> {
    const records = await this.prisma.inventory.findMany({
      where: { productId },
      include: { batch: true },
    });

    return records.map((record) => this.toDomain(record));
  }

  private async resolveBatchId(
    productId: string,
    lotCode?: string,
    expirationDate?: Date,
  ): Promise<string | null> {
    if (!lotCode) {
      return null;
    }

    const existing = await this.prisma.batch.findFirst({ where: { productId, batchCode: lotCode } });
    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.batch.create({
      data: {
        productId,
        batchCode: lotCode,
        expiryDate: expirationDate,
      },
    });

    return created.id;
  }

  private mapStockState(stockState: StockState): StockStatus {
    return StockStatus[stockState as keyof typeof StockStatus];
  }

  private toDomain(record: {
    id: string;
    productId: string;
    quantity: Prisma.Decimal;
    uom: string;
    locationId: string;
    stockStatus: StockStatus;
    batchId: string | null;
    batch: { batchCode: string; expiryDate: Date | null } | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
  }): StockItem {
    return new StockItem(
      record.productId,
      new Prisma.Decimal(record.quantity).toNumber(),
      record.uom,
      record.locationId,
      record.batch?.batchCode ?? undefined,
      record.batch?.expiryDate ?? undefined,
      record.stockStatus as unknown as StockState,
      record.id,
      record.createdAt,
      record.updatedAt,
      record.createdBy ?? undefined,
      record.updatedBy ?? undefined,
    );
  }
}
