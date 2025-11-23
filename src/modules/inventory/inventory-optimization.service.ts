import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockStatus, ZoneType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { ConfigService } from '../config/config.service';
import { GenerateSlottingRuleDto, RelocationSuggestionDto, WarehouseBalanceDto } from './dto/slotting.dto';

@Injectable()
export class InventoryOptimizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService,
  ) {}

  async generateSlottingRules(dto: GenerateSlottingRuleDto) {
    const tenantId = this.tenantContext.getTenantId();
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId } as any });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } as any });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const velocity = dto.velocity ?? 'MEDIUM';
    const zoneConfigs = await this.configService.getWarehouseZones(tenantId, dto.warehouseId);
    const storageZones = zoneConfigs.filter((zone) => zone.allowStorage);
    const pickingZones = zoneConfigs.filter((zone) => zone.allowPicking);

    const inventory = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        productId: dto.productId,
        location: { warehouseId: dto.warehouseId, tenantId } as any,
      } as any,
      include: { location: true },
    });

    const sortedByQty = [...inventory].sort(
      (a, b) => new Prisma.Decimal(b.quantity).toNumber() - new Prisma.Decimal(a.quantity).toNumber(),
    );
    const hotLocations = sortedByQty.slice(0, 3).map((record) => record.locationId);
    const recommendedZone =
      (velocity === 'FAST' && pickingZones[0]?.code) ||
      (velocity === 'SLOW' && storageZones.find((zone) => zone.zoneType === ZoneType.RESERVE)?.code) ||
      storageZones[0]?.code ||
      pickingZones[0]?.code ||
      sortedByQty[0]?.location.zone;

    const policy = await this.configService.resolveInventoryPolicy(tenantId, dto.warehouseId, dto.productId);
    const projectedDailyDemand = dto.projectedDailyDemand ?? 0;
    const reorderPoint = projectedDailyDemand ? Math.ceil(projectedDailyDemand * 2) : undefined;
    const varianceGuardrail = policy?.maxInventoryVariance ?? 0.2;

    return {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      velocity,
      recommendedZone,
      preferredLocations: hotLocations,
      reorderPoint,
      varianceGuardrail,
      rationale:
        recommendedZone
          ? `Preferir zona ${recommendedZone} para ${velocity.toLowerCase()} movers y minimizar variaciones mayores a ${varianceGuardrail * 100}%.`
          : 'No hay zonas configuradas; utilizar ubicaciones existentes mientras se configura slotting.',
    };
  }

  async suggestRelocations(dto: RelocationSuggestionDto) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.InventoryWhereInput = { tenantId } as any;
    if (dto.productId) where.productId = dto.productId;
    if (dto.warehouseId) {
      where.location = { warehouseId: dto.warehouseId, tenantId } as any;
    }

    const inventories = await this.prisma.inventory.findMany({
      where,
      include: { location: true },
    });

    const groupedByWarehouse = inventories.reduce((acc, record) => {
      const key = record.location.warehouseId;
      acc[key] = acc[key] ?? [];
      acc[key].push(record);
      return acc;
    }, {} as Record<string, typeof inventories>);

    const suggestions: any[] = [];
    const maxSuggestions = dto.maxSuggestions ?? 5;

    for (const [warehouseId, records] of Object.entries(groupedByWarehouse)) {
      const totalQty = records.reduce((sum, inv) => sum + new Prisma.Decimal(inv.quantity).toNumber(), 0);
      const avgQty = totalQty / (records.length || 1);
      const donors = records.filter((inv) => new Prisma.Decimal(inv.quantity).toNumber() > avgQty * 1.25);
      const receivers = records.filter((inv) => new Prisma.Decimal(inv.quantity).toNumber() < avgQty * 0.75);

      donors.sort(
        (a, b) => new Prisma.Decimal(b.quantity).toNumber() - new Prisma.Decimal(a.quantity).toNumber(),
      );
      receivers.sort(
        (a, b) => new Prisma.Decimal(a.quantity).toNumber() - new Prisma.Decimal(b.quantity).toNumber(),
      );

      while (donors.length && receivers.length && suggestions.length < maxSuggestions) {
        const donor = donors.shift()!;
        const receiver = receivers.shift()!;
        const moveQty = Math.min(
          new Prisma.Decimal(donor.quantity).toNumber() - avgQty,
          avgQty - new Prisma.Decimal(receiver.quantity).toNumber(),
        );
        suggestions.push({
          warehouseId,
          productId: donor.productId,
          fromLocationId: donor.locationId,
          toLocationId: receiver.locationId,
          quantity: Math.max(Math.ceil(moveQty), 1),
          note: 'Reubicar para nivelar carga por debajo del umbral de varianza',
        });
      }
    }

    if (!dto.warehouseId && suggestions.length < maxSuggestions) {
      const totalsByWarehouse = Object.entries(groupedByWarehouse).map(([warehouseId, records]) => ({
        warehouseId,
        qty: records.reduce((sum, inv) => sum + new Prisma.Decimal(inv.quantity).toNumber(), 0),
      }));

      totalsByWarehouse.sort((a, b) => b.qty - a.qty);
      const donor = totalsByWarehouse[0];
      const receiver = totalsByWarehouse[totalsByWarehouse.length - 1];

      if (donor && receiver && donor.warehouseId !== receiver.warehouseId && donor.qty > receiver.qty) {
        suggestions.push({
          productId: dto.productId,
          fromWarehouseId: donor.warehouseId,
          toWarehouseId: receiver.warehouseId,
          quantity: Math.max(Math.ceil((donor.qty - receiver.qty) / 2), 1),
          note: 'Mover entre almacenes para balancear inventario disponible',
        });
      }
    }

    return suggestions.slice(0, maxSuggestions);
  }

  async planWarehouseBalance(dto: WarehouseBalanceDto) {
    const tenantId = this.tenantContext.getTenantId();
    const [source, target, product] = await Promise.all([
      this.prisma.warehouse.findFirst({ where: { id: dto.sourceWarehouseId, tenantId } as any }),
      this.prisma.warehouse.findFirst({ where: { id: dto.targetWarehouseId, tenantId } as any }),
      this.prisma.product.findFirst({ where: { id: dto.productId, tenantId } as any }),
    ]);

    if (!source || !target) {
      throw new NotFoundException('Source or target warehouse not found');
    }
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sourceInventory = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        productId: dto.productId,
        stockStatus: StockStatus.AVAILABLE,
        location: { warehouseId: dto.sourceWarehouseId, tenantId } as any,
      } as any,
      include: { location: true },
    });

    const totalAvailable = sourceInventory.reduce((sum, inv) => sum + new Prisma.Decimal(inv.quantity).toNumber(), 0);
    if (totalAvailable < dto.quantity) {
      throw new BadRequestException('Source warehouse does not have enough available inventory');
    }

    const targetLocations = await this.prisma.location.findMany({
      where: { warehouseId: dto.targetWarehouseId, tenantId, isActive: true } as any,
    });

    if (!targetLocations.length) {
      throw new BadRequestException('Target warehouse does not have active locations');
    }

    const zones = await this.configService.getWarehouseZones(tenantId, dto.targetWarehouseId);
    const storageLocation = targetLocations.find((loc) => zones.some((zone) => zone.code === loc.zone && zone.allowStorage))
      ?? targetLocations[0];

    if (dto.respectCapacity) {
      const capacitySlots = targetLocations.length;
      const existingRecords = await this.prisma.inventory.count({
        where: { tenantId, productId: dto.productId, location: { warehouseId: dto.targetWarehouseId, tenantId } as any } as any,
      });
      if (existingRecords >= capacitySlots) {
        throw new BadRequestException('Target warehouse has no free capacity for this product');
      }
    }

    const donorLocation = sourceInventory.sort(
      (a, b) => new Prisma.Decimal(b.quantity).toNumber() - new Prisma.Decimal(a.quantity).toNumber(),
    )[0];

    return {
      productId: dto.productId,
      fromWarehouseId: dto.sourceWarehouseId,
      toWarehouseId: dto.targetWarehouseId,
      fromLocationId: donorLocation.locationId,
      toLocationId: storageLocation.id,
      quantity: dto.quantity,
      uom: dto.uom,
      requiresTransferOrder: source.id !== target.id,
      validations: {
        availableAtSource: totalAvailable,
        targetHasStorageZone: zones.some((zone) => zone.allowStorage),
      },
    };
  }
}
