import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MovementStatus,
  MovementType,
  Prisma,
  ReplenishmentMethod,
  ReplenishmentStatus,
  StockStatus,
  TransferOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { CacheService } from '../../common/cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { UsageService } from '../usage/usage.service';
import { CreateReplenishmentPolicyDto } from './dto/create-replenishment-policy.dto';
import { UpdateReplenishmentPolicyDto } from './dto/update-replenishment-policy.dto';
import { EvaluateReplenishmentDto } from './dto/evaluate-replenishment.dto';
import { ApproveSuggestionDto } from './dto/approve-suggestion.dto';
import { CreateTransferOrderDto } from './dto/create-transfer-order.dto';

const CONSUMPTION_CACHE_TTL = 300;
const DEFAULT_LOOKBACK_DAYS = 30;

@Injectable()
export class ReplenishmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly usage: UsageService,
  ) {}

  async createPolicy(tenantId: string, dto: CreateReplenishmentPolicyDto) {
    const policy = await this.prisma.replenishmentPolicy.create({
      data: { ...dto, tenantId },
    });
    return policy;
  }

  async updatePolicy(tenantId: string, id: string, dto: UpdateReplenishmentPolicyDto) {
    const existing = await this.prisma.replenishmentPolicy.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Replenishment policy not found');
    }
    return this.prisma.replenishmentPolicy.update({
      where: { id },
      data: dto,
    });
  }

  listPolicies(tenantId: string, warehouseId?: string, productId?: string) {
    return this.prisma.replenishmentPolicy.findMany({
      where: { tenantId, ...(warehouseId ? { warehouseId } : {}), ...(productId ? { productId } : {}) },
    });
  }

  async getPolicy(tenantId: string, id: string) {
    const policy = await this.prisma.replenishmentPolicy.findFirst({ where: { id, tenantId } });
    if (!policy) {
      throw new NotFoundException('Replenishment policy not found');
    }
    return policy;
  }

  async deletePolicy(tenantId: string, id: string) {
    const policy = await this.getPolicy(tenantId, id);
    return this.prisma.replenishmentPolicy.update({ where: { id: policy.id }, data: { isActive: false } });
  }

  private async getCurrentStock(tenantId: string, warehouseId: string, productId: string): Promise<number> {
    const inventory = await this.prisma.inventory.aggregate({
      where: {
        tenantId,
        productId,
        location: { warehouseId },
      } as any,
      _sum: { quantity: true },
    });
    return Number(inventory._sum.quantity ?? 0);
  }

  private async getAverageDailyConsumption(
    tenantId: string,
    warehouseId: string,
    productId: string,
  ): Promise<number> {
    const cacheKey = this.cache.buildKey('replen:consumption', [tenantId, warehouseId, productId]);
    const cached = await this.cache.getJson<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const since = new Date();
    since.setDate(since.getDate() - DEFAULT_LOOKBACK_DAYS);

    const [movementConsumption, outboundConsumption] = await Promise.all([
      this.prisma.movementLine.aggregate({
        where: {
          tenantId,
          productId,
          movementHeader: { warehouseId, movementType: MovementType.OUTBOUND_SHIPMENT, createdAt: { gte: since } },
        } as any,
        _sum: { quantity: true },
      }),
      this.prisma.outboundOrderLine.aggregate({
        where: { tenantId, productId, outboundOrder: { warehouseId, createdAt: { gte: since } } } as any,
        _sum: { pickedQty: true },
      }),
    ]);

    const movementQty = Number(movementConsumption._sum.quantity ?? 0);
    const outboundQty = Number(outboundConsumption._sum.pickedQty ?? 0);
    const days = Math.max(1, DEFAULT_LOOKBACK_DAYS);
    const dailyConsumption = (movementQty + outboundQty) / days;

    await this.cache.setJson(cacheKey, dailyConsumption, CONSUMPTION_CACHE_TTL);
    return dailyConsumption;
  }

  private computeSuggestion(
    policy: any,
    stockActual: number,
    consumptionPerDay: number,
  ): { suggestedQty: number; reason: string } {
    switch (policy.method) {
      case ReplenishmentMethod.FIXED:
        return { suggestedQty: policy.fixedQty ?? 0, reason: 'FIXED' };
      case ReplenishmentMethod.MIN_MAX: {
        const minQty = policy.minQty ?? 0;
        const maxQty = policy.maxQty ?? 0;
        const suggestedQty = stockActual < minQty ? Math.max(0, maxQty - stockActual) : 0;
        return { suggestedQty, reason: 'MIN_MAX' };
      }
      case ReplenishmentMethod.EOQ:
        return { suggestedQty: policy.eoqQty ?? 0, reason: 'EOQ' };
      case ReplenishmentMethod.DOS: {
        const targetDays = policy.daysOfSupply ?? 0;
        const stockDeseado = consumptionPerDay * targetDays;
        const suggestedQty = Math.max(0, Math.ceil(stockDeseado - stockActual));
        return { suggestedQty, reason: 'DOS' };
      }
      default:
        return { suggestedQty: 0, reason: 'UNKNOWN' };
    }
  }

  async evaluateReplenishment(tenantId: string, dto: EvaluateReplenishmentDto) {
    const policies = await this.prisma.replenishmentPolicy.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.productId ? { productId: dto.productId } : {}),
      },
    });

    const suggestions = [] as any[];

    for (const policy of policies) {
      const [stockActual, consumptionPerDay] = await Promise.all([
        this.getCurrentStock(tenantId, policy.warehouseId, policy.productId),
        this.getAverageDailyConsumption(tenantId, policy.warehouseId, policy.productId),
      ]);

      const { suggestedQty, reason } = this.computeSuggestion(policy, stockActual, consumptionPerDay);
      if (!dto.force && suggestedQty <= 0) {
        continue;
      }

      const suggestion = await this.prisma.replenishmentSuggestion.create({
        data: {
          tenantId,
          policyId: policy.id,
          warehouseId: policy.warehouseId,
          productId: policy.productId,
          suggestedQty,
          reason,
        },
      });
      suggestions.push(suggestion);
    }

    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'REPLENISHMENT',
      action: 'EVALUATE',
      metadata: dto,
    });

    return suggestions;
  }

  async approveSuggestion(tenantId: string, dto: ApproveSuggestionDto) {
    const suggestion = await this.prisma.replenishmentSuggestion.findFirst({
      where: { id: dto.suggestionId, tenantId },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }
    const status = dto.approve ? ReplenishmentStatus.APPROVED : ReplenishmentStatus.REJECTED;
    const updated = await this.prisma.replenishmentSuggestion.update({
      where: { id: suggestion.id },
      data: { status },
    });

    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'REPLENISHMENT',
      action: 'APPROVE',
      entityId: suggestion.id,
      metadata: { approve: dto.approve },
    });

    return updated;
  }

  async createTransferOrderFromSuggestions(tenantId: string, dto: CreateTransferOrderDto) {
    await this.usage.checkLimit(tenantId, 'monthlyOrders', 1);

    const suggestionLines = dto.suggestionIds?.length
      ? await this.prisma.replenishmentSuggestion.findMany({ where: { tenantId, id: { in: dto.suggestionIds } } })
      : [];

    const lines = dto.lines?.length
      ? dto.lines
      : suggestionLines.map((s) => ({ productId: s.productId, quantity: s.suggestedQty }));

    const result = await this.prisma.$transaction(async (tx) => {
      const transferOrder = await tx.transferOrder.create({
        data: {
          tenantId,
          sourceWarehouseId: dto.sourceWarehouseId,
          destinationWarehouseId: dto.destinationWarehouseId,
          status: TransferOrderStatus.CREATED,
          lines: { create: lines.map((line) => ({ ...line, tenantId })) },
        },
        include: { lines: true },
      });

      const sourceLocation = await tx.location.findFirst({
        where: { tenantId, warehouseId: dto.sourceWarehouseId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      const destinationLocation = await tx.location.findFirst({
        where: { tenantId, warehouseId: dto.destinationWarehouseId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!sourceLocation || !destinationLocation) {
        throw new NotFoundException('Default locations not found for transfer order');
      }

      const movementHeader = await tx.movementHeader.create({
        data: {
          tenantId,
          movementType: MovementType.INTERNAL_TRANSFER,
          warehouseId: dto.sourceWarehouseId,
          status: MovementStatus.COMPLETED,
          reference: transferOrder.id,
        },
      });

      for (const line of transferOrder.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        const uom = product?.defaultUom ?? 'EA';
        const qtyDecimal = new Prisma.Decimal(line.quantity);
        await tx.movementLine.create({
          data: {
            tenantId,
            movementHeaderId: movementHeader.id,
            productId: line.productId,
            quantity: qtyDecimal,
            uom,
            fromLocationId: sourceLocation?.id ?? null,
            toLocationId: destinationLocation?.id ?? null,
          },
        });

        const sourceInventory = await tx.inventory.findFirst({
          where: {
            tenantId,
            productId: line.productId,
            locationId: sourceLocation?.id ?? undefined,
            stockStatus: StockStatus.AVAILABLE,
            uom,
          } as any,
        });

        const destinationInventory = await tx.inventory.findFirst({
          where: {
            tenantId,
            productId: line.productId,
            locationId: destinationLocation?.id ?? undefined,
            stockStatus: StockStatus.AVAILABLE,
            uom,
          } as any,
        });

        const sourceQty = new Prisma.Decimal(sourceInventory?.quantity ?? 0).minus(qtyDecimal);
        const destQty = new Prisma.Decimal(destinationInventory?.quantity ?? 0).plus(qtyDecimal);

        if (sourceInventory) {
          await tx.inventory.update({ where: { id: sourceInventory.id }, data: { quantity: sourceQty } });
        }

        if (destinationInventory) {
          await tx.inventory.update({ where: { id: destinationInventory.id }, data: { quantity: destQty } });
        } else {
          await tx.inventory.create({
            data: {
              tenantId,
              productId: line.productId,
              locationId: destinationLocation?.id,
              quantity: destQty,
              stockStatus: StockStatus.AVAILABLE,
              uom,
            } as any,
          });
        }
      }

      const completedOrder = await tx.transferOrder.update({
        where: { id: transferOrder.id },
        data: { status: TransferOrderStatus.COMPLETED },
        include: { lines: true },
      });

      if (suggestionLines.length) {
        await tx.replenishmentSuggestion.updateMany({
          where: { id: { in: suggestionLines.map((s) => s.id) } },
          data: { status: ReplenishmentStatus.EXECUTED },
        });
      }

      return completedOrder;
    });

    await this.usage.incrementUsage(tenantId, 'monthlyOrders', 1);
    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'REPLENISHMENT',
      action: 'CREATE_TRANSFER',
      entityId: result.id,
      metadata: { suggestionIds: dto.suggestionIds, lines: result.lines.length },
    });

    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'TRANSFER_ORDER',
      action: 'COMPLETED',
      entityId: result.id,
    });

    return result;
  }

  async listTransferOrders(tenantId: string) {
    const orders = await this.prisma.transferOrder.findMany({
      where: { tenantId },
      include: { lines: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      ...order,
      lines: order.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productSku: line.product?.sku,
        productName: line.product?.name,
        quantity: line.quantity,
        uom: line.product?.defaultUom ?? 'EA',
      })),
    }));
  }

  async listSuggestions(tenantId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [total, suggestions] = await this.prisma.$transaction([
      this.prisma.replenishmentSuggestion.count({ where: { tenantId } }),
      this.prisma.replenishmentSuggestion.findMany({
        where: { tenantId },
        include: { policy: { include: { warehouse: true, product: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const items = suggestions.map((suggestion) => ({
      id: suggestion.id,
      sku: suggestion.policy?.product?.sku ?? suggestion.productId,
      productName: suggestion.policy?.product?.name,
      suggestedQty: suggestion.suggestedQty,
      uom: suggestion.policy?.product?.defaultUom ?? 'EA',
      sourceLocation: suggestion.policy?.warehouse?.code ?? 'RESERVE',
      destinationLocation: suggestion.policy?.warehouse?.code ?? 'PICKING',
      reason: suggestion.reason ?? 'Reabastecimiento sugerido',
      score: undefined,
      status: suggestion.status,
      policyApplied: suggestion.policy?.method ?? undefined,
      safetyStock: suggestion.policy?.safetyStock ?? undefined,
      min: suggestion.policy?.minQty ?? undefined,
      max: suggestion.policy?.maxQty ?? undefined,
    }));

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async listHistory(tenantId: string) {
    const lines = await this.prisma.movementLine.findMany({
      where: { tenantId, movementHeader: { movementType: MovementType.INTERNAL_TRANSFER } } as any,
      include: { product: true, fromLocation: true, toLocation: true, movementHeader: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return lines.map((line) => ({
      id: line.id,
      date: line.createdAt.toISOString(),
      sku: line.product?.sku ?? line.productId,
      productName: line.product?.name,
      quantity: Number(line.quantity ?? 0),
      user: line.movementHeader?.createdBy ?? 'sistema',
      source: line.fromLocation?.code ?? '-',
      destination: line.toLocation?.code ?? '-',
      reference: line.movementHeader?.reference ?? undefined,
    }));
  }

  async executeSuggestion(tenantId: string, id: string) {
    const suggestion = await this.prisma.replenishmentSuggestion.findFirst({ where: { id, tenantId } });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }
    return this.prisma.replenishmentSuggestion.update({
      where: { id },
      data: { status: ReplenishmentStatus.EXECUTED },
    });
  }

  async updateTransferOrderStatus(tenantId: string, id: string, status: TransferOrderStatus) {
    const order = await this.prisma.transferOrder.findFirst({ where: { id, tenantId } });
    if (!order) {
      throw new NotFoundException('Transfer order not found');
    }
    return this.prisma.transferOrder.update({ where: { id }, data: { status } });
  }
}
