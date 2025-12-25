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
import { CreateInboundLegacyDto } from './dto/create-inbound-legacy.dto';
import { GetInboundLegacyFilterDto } from './dto/get-inbound-legacy-filter.dto';
import { ReceiveInboundLineDto } from './dto/receive-inbound-line.dto';
import { TenantContextService } from '../../common/tenant-context.service';
import { ConfigService } from '../config/config.service';
import { PaginationService } from '../../common/pagination/pagination.service';

@Injectable()
export class InboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService,
    private readonly pagination: PaginationService,
  ) {}

  async createReceipt(dto: CreateInboundReceiptDto) {
    const tenantId = this.tenantContext.getTenantId();

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId } as any,
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.prisma.inboundReceipt.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        externalRef: dto.externalRef,
        status: InboundReceiptStatus.DRAFT,
      } as any,
    });
  }

  async addLine(receiptId: string, dto: AddInboundReceiptLineDto) {
    const tenantId = this.tenantContext.getTenantId();

    const receipt = (await this.prisma.inboundReceipt.findFirst({
      where: { id: receiptId, tenantId } as any,
      include: { lines: { where: { tenantId } as any } } as any,
    })) as any;

    if (!receipt) {
      throw new NotFoundException('Inbound receipt not found');
    }

    if (receipt.status !== InboundReceiptStatus.DRAFT) {
      throw new BadRequestException('Cannot add lines to a confirmed receipt');
    }

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } as any });
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
        tenantId,
        inboundReceiptId: receipt.id,
        productId: dto.productId,
        expectedQty,
        uom: dto.uom,
        batchCode: dto.batchCode,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        sourceDocumentLineRef: dto.sourceDocumentLineRef,
      } as any,
    });
  }

  async listReceipts(filters: GetInboundReceiptsFilterDto) {
    const tenantId = this.tenantContext.getTenantId();
    const { skip, take } = this.pagination.buildPaginationParams(filters.page, filters.limit);

    return this.prisma.inboundReceipt.findMany({
      where: {
        tenantId,
        warehouseId: filters.warehouseId,
        status: filters.status,
        createdAt: {
          gte: filters.fromDate ? new Date(filters.fromDate) : undefined,
          lte: filters.toDate ? new Date(filters.toDate) : undefined,
        },
      } as any,
      include: { lines: { where: { tenantId } as any } } as any,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getReceipt(id: string) {
    const tenantId = this.tenantContext.getTenantId();

    const receipt = (await this.prisma.inboundReceipt.findFirst({
      where: { id, tenantId } as any,
      include: { lines: { where: { tenantId } as any } } as any,
    })) as any;

    if (!receipt) {
      throw new NotFoundException('Inbound receipt not found');
    }

    return receipt;
  }

  async confirmReceipt(id: string, dto: ConfirmInboundReceiptDto) {
    const tenantId = this.tenantContext.getTenantId();

    await this.configService.getTenantConfig(tenantId);

    return this.prisma.$transaction(async (tx) => {
      const receipt = (await tx.inboundReceipt.findFirst({
        where: { id, tenantId } as any,
        include: {
          lines: { where: { tenantId } as any, include: { product: true } } as any,
          warehouse: true,
        },
      })) as any;

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

      const destinationLocation = await tx.location.findFirst({
        where: { id: dto.toLocationId, tenantId } as any,
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
      }[] = dto.lines ?? receipt.lines.map((line: any) => ({ lineId: line.id }));

      if (!linePayloads.length) {
        throw new BadRequestException('No lines to process');
      }

      const movementLines: any[] = [];

      for (const payload of linePayloads) {
        const receiptLine = receipt.lines.find((line: any) => line.id === payload.lineId);
        if (!receiptLine) {
          throw new NotFoundException(`Line ${payload.lineId} not found in receipt`);
        }

        const pendingQty = new Prisma.Decimal(receiptLine.expectedQty).minus(receiptLine.receivedQty);
        const receiveQty =
          payload.receivedQty === undefined || payload.receivedQty === null
            ? pendingQty
            : new Prisma.Decimal(payload.receivedQty);

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

        const policy = await this.configService.resolveInventoryPolicy(
          tenantId,
          receipt.warehouseId,
          receiptLine.productId,
        );

        const expectedQty = new Prisma.Decimal(receiptLine.expectedQty);
        const newTotalQty = new Prisma.Decimal(receiptLine.receivedQty).plus(receiveQty);
        const maxOverPct = policy?.maxOverReceiptPct ?? 0;
        const maxAllowed = expectedQty.mul(1 + maxOverPct / 100);
        if (newTotalQty.gt(maxAllowed)) {
          throw new BadRequestException('Received quantity exceeds allowed tolerance');
        }

        const maxUnderPct = policy?.maxUnderReceiptPct;
        const remainingAfter = expectedQty.minus(newTotalQty);
        if (
          maxUnderPct !== null &&
          maxUnderPct !== undefined &&
          remainingAfter.gt(0) &&
          remainingAfter.gt(expectedQty.mul(maxUnderPct / 100))
        ) {
          throw new BadRequestException('Received quantity below allowed tolerance');
        }

        let batchId: string | null = null;
        if (receiptLine.product.requiresBatch) {
          const existingBatch = await tx.batch.findFirst({
            where: { productId: receiptLine.productId, batchCode: batchCode as string, tenantId } as any,
          });

          if (existingBatch) {
            batchId = existingBatch.id;
          } else {
            const createdBatch = await tx.batch.create({
              data: {
                tenantId,
                productId: receiptLine.productId,
                batchCode: batchCode as string,
                expiryDate,
              } as any,
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
          tenantId,
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
        where: { inboundReceiptId: receipt.id, tenantId } as any,
      });

      const allReceived = updatedLines.every((line) =>
        new Prisma.Decimal(line.receivedQty).gte(line.expectedQty),
      );

      const newStatus = allReceived
        ? InboundReceiptStatus.RECEIVED
        : InboundReceiptStatus.PARTIALLY_RECEIVED;

      const movementHeader = await tx.movementHeader.create({
        data: {
          tenantId,
          movementType: MovementType.INBOUND_RECEIPT,
          warehouseId: receipt.warehouseId,
          reference: receipt.id,
          status: MovementStatus.COMPLETED,
          lines: {
            create: movementLines.map((line) => ({ ...line, tenantId })),
          },
        } as any,
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

  async listLegacyReceipts(filters: GetInboundLegacyFilterDto) {
    const tenantId = this.tenantContext.getTenantId();
    const status = this.resolveLegacyStatus(filters.status);
    const { skip, take } = this.pagination.buildPaginationParams(filters.page, filters.limit);

    const where: Prisma.InboundReceiptWhereInput = {
      tenantId,
      warehouseId: filters.warehouseId,
      status: status ?? undefined,
      externalRef: filters.supplier ? { contains: filters.supplier, mode: 'insensitive' } : undefined,
      createdAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      },
    } as Prisma.InboundReceiptWhereInput;

    const [total, receipts] = await this.prisma.$transaction([
      this.prisma.inboundReceipt.count({ where }),
      this.prisma.inboundReceipt.findMany({
        where,
        include: {
          warehouse: true,
          lines: { include: { product: true } } as any,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const items = receipts.map((receipt) => this.mapLegacyReceipt(receipt));
    return {
      items,
      total,
      page: filters.page ?? 1,
      pageSize: filters.limit ?? 50,
    };
  }

  async getLegacyReceipt(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const receipt = await this.prisma.inboundReceipt.findFirst({
      where: { id, tenantId } as any,
      include: {
        warehouse: true,
        lines: { include: { product: true } } as any,
      },
    });
    if (!receipt) {
      throw new NotFoundException('Inbound receipt not found');
    }
    return this.mapLegacyReceipt(receipt);
  }

  async createLegacyReceipt(dto: CreateInboundLegacyDto) {
    const tenantId = this.tenantContext.getTenantId();
    const receipt = await this.createReceipt({
      warehouseId: dto.warehouseId,
      externalRef: dto.supplier,
    });

    for (const line of dto.lines ?? []) {
      const product = await this.prisma.product.findFirst({
        where: { tenantId, sku: line.sku } as any,
      });
      if (!product) {
        throw new NotFoundException(`Product ${line.sku} not found`);
      }
      await this.addLine(receipt.id, {
        productId: product.id,
        expectedQty: line.expectedQty,
        uom: line.uom,
      });
    }

    return this.getLegacyReceipt(receipt.id);
  }

  async receiveLegacyLine(receiptId: string, dto: ReceiveInboundLineDto) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.inboundReceipt.findFirst({
        where: { id: receiptId, tenantId } as any,
        include: { lines: true },
      });
      if (!receipt) {
        throw new NotFoundException('Inbound receipt not found');
      }
      if (
        receipt.status === InboundReceiptStatus.RECEIVED ||
        receipt.status === InboundReceiptStatus.CANCELLED
      ) {
        throw new BadRequestException('Receipt cannot be updated in its current status');
      }

      const line = receipt.lines.find((item) => item.id === dto.lineId);
      if (!line) {
        throw new NotFoundException('Receipt line not found');
      }

      const locationValue = dto.location?.trim();
      if (!locationValue) {
        throw new BadRequestException('Destination location is required');
      }

      const destinationLocation = await tx.location.findFirst({
        where: {
          tenantId,
          warehouseId: receipt.warehouseId,
          OR: [{ id: locationValue }, { code: locationValue }],
        } as any,
      });

      if (!destinationLocation) {
        throw new NotFoundException('Destination location not found');
      }

      const product = await tx.product.findFirst({
        where: { id: line.productId, tenantId } as any,
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const expected = new Prisma.Decimal(line.expectedQty);
      const previousReceived = new Prisma.Decimal(line.receivedQty ?? 0);
      const received = previousReceived.plus(dto.quantity);
      const finalReceived = received.gt(expected) ? expected : received;
      const deltaQty = finalReceived.minus(previousReceived);

      if (deltaQty.lte(0)) {
        throw new BadRequestException('Received quantity must be greater than zero');
      }

      const batchCode = dto.batch ?? line.batchCode;
      if (product.requiresBatch && !batchCode) {
        throw new BadRequestException('Batch code is required for this product');
      }

      let batchId: string | undefined;
      if (product.requiresBatch && batchCode) {
        const existingBatch = await tx.batch.findFirst({
          where: { tenantId, productId: line.productId, batchCode } as any,
        });
        if (existingBatch) {
          batchId = existingBatch.id;
        } else {
          const createdBatch = await tx.batch.create({
            data: {
              tenantId,
              productId: line.productId,
              batchCode,
            } as any,
          });
          batchId = createdBatch.id;
        }
      }

      await tx.inboundReceiptLine.update({
        where: { id: line.id },
        data: {
          receivedQty: finalReceived,
          batchCode,
          batchId: batchId ?? line.batchId ?? undefined,
        },
      });

      await this.inventoryService.increaseStock(
        {
          warehouseId: receipt.warehouseId,
          productId: line.productId,
          batchId,
          locationId: destinationLocation.id,
          quantity: deltaQty,
          uom: line.uom,
          stockStatus: StockStatus.AVAILABLE,
        },
        tx as any,
        tenantId,
      );

      await tx.movementHeader.create({
        data: {
          tenantId,
          movementType: MovementType.INBOUND_RECEIPT,
          warehouseId: receipt.warehouseId,
          reference: receipt.id,
          status: MovementStatus.COMPLETED,
          lines: {
            create: [
              {
                tenantId,
                productId: line.productId,
                batchId,
                toLocationId: destinationLocation.id,
                quantity: deltaQty,
                uom: line.uom,
              },
            ],
          },
        } as any,
      });

      const updatedLines = receipt.lines.map((item) =>
        item.id === line.id ? { ...item, receivedQty: finalReceived } : item,
      );
      const allReceived = updatedLines.every((item) =>
        new Prisma.Decimal(item.receivedQty ?? 0).gte(item.expectedQty),
      );

      await tx.inboundReceipt.update({
        where: { id: receiptId },
        data: {
          status: allReceived ? InboundReceiptStatus.RECEIVED : InboundReceiptStatus.PARTIALLY_RECEIVED,
          receivedAt: allReceived ? new Date() : receipt.receivedAt,
        },
      });

      const updated = await tx.inboundReceipt.findFirst({
        where: { id: receiptId, tenantId } as any,
        include: {
          warehouse: true,
          lines: { include: { product: true } } as any,
        },
      });
      if (!updated) {
        throw new NotFoundException('Inbound receipt not found');
      }
      return this.mapLegacyReceipt(updated);
    });
  }

  async completeLegacyReceipt(receiptId: string) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.inboundReceipt.findFirst({
        where: { id: receiptId, tenantId } as any,
        include: { lines: true },
      });
      if (!receipt) {
        throw new NotFoundException('Inbound receipt not found');
      }

      const pendingLines = receipt.lines.filter((line) =>
        new Prisma.Decimal(line.receivedQty ?? 0).lt(line.expectedQty),
      );
      if (pendingLines.length) {
        throw new BadRequestException('All lines must be received before completing');
      }

      await tx.inboundReceipt.update({
        where: { id: receiptId },
        data: { status: InboundReceiptStatus.RECEIVED, receivedAt: new Date() },
      });

      const updated = await tx.inboundReceipt.findFirst({
        where: { id: receiptId, tenantId } as any,
        include: {
          warehouse: true,
          lines: { include: { product: true } } as any,
        },
      });
      if (!updated) {
        throw new NotFoundException('Inbound receipt not found');
      }
      return this.mapLegacyReceipt(updated);
    });
  }

  private resolveLegacyStatus(status?: string) {
    if (!status) return undefined;
    const normalized = status.toUpperCase();
    if (normalized === 'CREATED') return InboundReceiptStatus.DRAFT;
    if (normalized === 'IN_PROGRESS') return InboundReceiptStatus.PARTIALLY_RECEIVED;
    if (normalized === 'COMPLETED') return InboundReceiptStatus.RECEIVED;
    if (normalized in InboundReceiptStatus) {
      return InboundReceiptStatus[normalized as keyof typeof InboundReceiptStatus];
    }
    return undefined;
  }

  private mapLegacyStatus(status: InboundReceiptStatus) {
    switch (status) {
      case InboundReceiptStatus.DRAFT:
        return 'CREATED';
      case InboundReceiptStatus.PARTIALLY_RECEIVED:
        return 'IN_PROGRESS';
      case InboundReceiptStatus.RECEIVED:
        return 'COMPLETED';
      case InboundReceiptStatus.CANCELLED:
        return 'COMPLETED';
      default:
        return 'CREATED';
    }
  }

  private mapLegacyReceipt(receipt: any) {
    return {
      id: receipt.id,
      code: receipt.externalRef ?? receipt.id,
      supplier: receipt.externalRef ?? 'N/D',
      warehouseId: receipt.warehouseId,
      warehouseName: receipt.warehouse?.name,
      expectedDate: receipt.createdAt?.toISOString?.() ?? receipt.createdAt,
      status: this.mapLegacyStatus(receipt.status),
      createdAt: receipt.createdAt,
      lines: (receipt.lines ?? []).map((line: any) => ({
        id: line.id,
        productId: line.productId,
        productSku: line.product?.sku ?? line.productId,
        productName: line.product?.name,
        expectedQty: Number(line.expectedQty),
        receivedQty: Number(line.receivedQty ?? 0),
        uom: line.uom,
        isBatchManaged: line.product?.requiresBatch ?? false,
        batchNumber: line.batchCode ?? null,
      })),
    };
  }
}
