import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InboundReceiptStatus,
  MovementStatus,
  MovementType,
  Prisma,
  StockStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateInboundReceiptDto } from './dto/create-inbound-receipt.dto';
import { AddInboundReceiptLineDto } from './dto/add-inbound-receipt-line.dto';
import { ConfirmInboundReceiptDto } from './dto/confirm-inbound-receipt.dto';
import { GetInboundReceiptsFilterDto } from './dto/get-inbound-receipts-filter.dto';

@Injectable()
export class InboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createReceipt(dto: CreateInboundReceiptDto) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.prisma.inboundReceipt.create({
      data: {
        warehouseId: dto.warehouseId,
        externalRef: dto.externalRef,
        status: InboundReceiptStatus.DRAFT,
      },
    });
  }

  async addLine(receiptId: string, dto: AddInboundReceiptLineDto) {
    const receipt = await this.prisma.inboundReceipt.findUnique({
      where: { id: receiptId },
      include: { lines: true },
    });

    if (!receipt) {
      throw new NotFoundException('Inbound receipt not found');
    }

    if (receipt.status !== InboundReceiptStatus.DRAFT) {
      throw new BadRequestException('Cannot add lines to a confirmed receipt');
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.requiresBatch && !dto.batchCode) {
      throw new BadRequestException('Batch code is required for this product');
    }

    if (product.requiresExpiryDate && !dto.expiryDate) {
      throw new BadRequestException('Expiry date is required for this product');
    }

    const expectedQty = new Prisma.Decimal(dto.expectedQty);

    return this.prisma.inboundReceiptLine.create({
      data: {
        inboundReceiptId: receipt.id,
        productId: dto.productId,
        expectedQty,
        uom: dto.uom,
        batchCode: dto.batchCode,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        sourceDocumentLineRef: dto.sourceDocumentLineRef,
      },
    });
  }

  async listReceipts(filters: GetInboundReceiptsFilterDto) {
    return this.prisma.inboundReceipt.findMany({
      where: {
        warehouseId: filters.warehouseId,
        status: filters.status,
        createdAt: {
          gte: filters.fromDate ? new Date(filters.fromDate) : undefined,
          lte: filters.toDate ? new Date(filters.toDate) : undefined,
        },
      },
      include: { lines: true },
    });
  }

  async getReceipt(id: string) {
    const receipt = await this.prisma.inboundReceipt.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!receipt) {
      throw new NotFoundException('Inbound receipt not found');
    }

    return receipt;
  }

  async confirmReceipt(id: string, dto: ConfirmInboundReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.inboundReceipt.findUnique({
        where: { id },
        include: {
          lines: { include: { product: true } },
          warehouse: true,
        },
      });

      if (!receipt) {
        throw new NotFoundException('Inbound receipt not found');
      }

      if (
        receipt.status !== InboundReceiptStatus.DRAFT &&
        receipt.status !== InboundReceiptStatus.PARTIALLY_RECEIVED
      ) {
        throw new BadRequestException('Receipt cannot be confirmed in its current status');
      }

      if (!receipt.lines.length) {
        throw new BadRequestException('Receipt has no lines to confirm');
      }

      const destinationLocation = await tx.location.findUnique({
        where: { id: dto.toLocationId },
      });

      if (!destinationLocation) {
        throw new NotFoundException('Destination location not found');
      }

      if (destinationLocation.warehouseId !== receipt.warehouseId) {
        throw new BadRequestException('Destination location must be in the same warehouse');
      }

      if (dto.lines) {
        if (!dto.lines.length) {
          throw new BadRequestException('At least one line must be provided');
        }
        const lineIds = new Set<string>();
        for (const line of dto.lines) {
          if (lineIds.has(line.lineId)) {
            throw new BadRequestException('Duplicate line IDs are not allowed');
          }
          lineIds.add(line.lineId);
        }
      }

      const linePayloads: {
        lineId: string;
        receivedQty?: number;
        batchCode?: string;
        expiryDate?: string;
      }[] = dto.lines ?? receipt.lines.map((line) => ({ lineId: line.id }));

      if (!linePayloads.length) {
        throw new BadRequestException('No lines to process');
      }

      const movementLines: Prisma.MovementLineCreateWithoutMovementHeaderInput[] = [];

      for (const payload of linePayloads) {
        const receiptLine = receipt.lines.find((line) => line.id === payload.lineId);
        if (!receiptLine) {
          throw new NotFoundException(`Line ${payload.lineId} not found in receipt`);
        }

        const pendingQty = new Prisma.Decimal(receiptLine.expectedQty).minus(receiptLine.receivedQty);
        const receiveQty =
          payload.receivedQty === undefined || payload.receivedQty === null
            ? pendingQty
            : new Prisma.Decimal(payload.receivedQty);

        if (receiveQty.gt(pendingQty)) {
          throw new BadRequestException('Received quantity exceeds pending quantity');
        }

        if (receiveQty.lte(0)) {
          throw new BadRequestException('Received quantity must be greater than zero');
        }

        const batchCode = payload.batchCode ?? receiptLine.batchCode;
        const expiryDate = payload.expiryDate
          ? new Date(payload.expiryDate)
          : receiptLine.expiryDate ?? undefined;

        if (receiptLine.product.requiresBatch && !batchCode) {
          throw new BadRequestException('Batch code is required for this product');
        }

        if (receiptLine.product.requiresExpiryDate && !expiryDate) {
          throw new BadRequestException('Expiry date is required for this product');
        }

        let batchId: string | null = null;
        if (receiptLine.product.requiresBatch) {
          const existingBatch = await tx.batch.findFirst({
            where: { productId: receiptLine.productId, batchCode: batchCode as string },
          });

          if (existingBatch) {
            batchId = existingBatch.id;
          } else {
            const createdBatch = await tx.batch.create({
              data: {
                productId: receiptLine.productId,
                batchCode: batchCode as string,
                expiryDate,
              },
            });
            batchId = createdBatch.id;
          }
        }

        await tx.inboundReceiptLine.update({
          where: { id: receiptLine.id },
          data: {
            receivedQty: new Prisma.Decimal(receiptLine.receivedQty).plus(receiveQty),
            batchCode,
            expiryDate,
            batchId: batchId ?? undefined,
          },
        });

        await this.inventoryService.increaseStock(
          {
            warehouseId: receipt.warehouseId,
            productId: receiptLine.productId,
            batchId: batchId ?? undefined,
            locationId: destinationLocation.id,
            quantity: receiveQty,
            uom: receiptLine.uom,
            stockStatus: StockStatus.AVAILABLE,
          },
          tx,
        );

        movementLines.push({
          product: { connect: { id: receiptLine.productId } },
          batch: batchId ? { connect: { id: batchId } } : undefined,
          fromLocation: undefined,
          toLocation: { connect: { id: destinationLocation.id } },
          quantity: receiveQty,
          uom: receiptLine.uom,
        });
      }

      if (!movementLines.length) {
        throw new BadRequestException('Cannot create movement without lines');
      }

      const updatedLines = await tx.inboundReceiptLine.findMany({
        where: { inboundReceiptId: receipt.id },
      });

      const allReceived = updatedLines.every((line) =>
        new Prisma.Decimal(line.receivedQty).gte(line.expectedQty),
      );

      const newStatus = allReceived
        ? InboundReceiptStatus.RECEIVED
        : InboundReceiptStatus.PARTIALLY_RECEIVED;

      const movementHeader = await tx.movementHeader.create({
        data: {
          movementType: MovementType.INBOUND_RECEIPT,
          warehouseId: receipt.warehouseId,
          reference: receipt.id,
          status: MovementStatus.COMPLETED,
          lines: {
            create: movementLines,
          },
        },
        include: { lines: true },
      });

      await tx.inboundReceipt.update({
        where: { id: receipt.id },
        data: {
          status: newStatus,
          receivedAt:
            newStatus === InboundReceiptStatus.RECEIVED ? new Date() : receipt.receivedAt,
        },
      });

      return {
        receiptId: receipt.id,
        status: newStatus,
        movement: movementHeader,
      };
    });
  }
}
