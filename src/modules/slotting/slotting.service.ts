import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CompatibilityType,
  MovementStatus,
  MovementType,
  Prisma,
  SlottingStatus,
  StockStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { CreateSlottingConfigDto } from './dto/create-slotting-config.dto';
import { UpdateSlottingConfigDto } from './dto/update-slotting-config.dto';
import { CalculateSlottingDto } from './dto/calculate-slotting.dto';
import { ApproveSlottingDto } from './dto/approve-slotting.dto';

const CONSUMPTION_CACHE_TTL = 300;
const DISTANCE_CACHE_TTL = 3600;

type AbcClass = 'A' | 'B' | 'C';
type XyzClass = 'X' | 'Y' | 'Z';

@Injectable()
export class SlottingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  createConfig(tenantId: string, dto: CreateSlottingConfigDto) {
    return this.prisma.slottingConfig.create({ data: { ...dto, tenantId } });
  }

  async updateConfig(tenantId: string, id: string, dto: UpdateSlottingConfigDto) {
    const existing = await this.prisma.slottingConfig.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Slotting config not found');
    }
    return this.prisma.slottingConfig.update({ where: { id }, data: dto });
  }

  listConfigs(tenantId: string, warehouseId?: string) {
    return this.prisma.slottingConfig.findMany({
      where: { tenantId, ...(warehouseId ? { warehouseId } : {}) },
    });
  }

  private buildCacheKey(namespace: string, parts: (string | number | undefined)[]) {
    return this.cache.buildKey(namespace, parts.filter((p) => p !== undefined));
  }

  private async getConsumption(tenantId: string, warehouseId: string, productId: string, days: number) {
    const cacheKey = this.buildCacheKey('slotting:consumption', [tenantId, warehouseId, productId]);
    const cached = await this.cache.getJson<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [movement, outbound] = await Promise.all([
      this.prisma.movementLine.aggregate({
        where: {
          tenantId,
          productId,
          movementHeader: {
            warehouseId,
            movementType: MovementType.OUTBOUND_SHIPMENT,
            createdAt: { gte: since },
          },
        } as any,
        _sum: { quantity: true },
      }),
      this.prisma.outboundOrderLine.aggregate({
        where: { tenantId, productId, outboundOrder: { warehouseId, createdAt: { gte: since } } } as any,
        _sum: { pickedQty: true },
      }),
    ]);

    const qty = Number(movement._sum.quantity ?? 0) + Number(outbound._sum.pickedQty ?? 0);
    await this.cache.setJson(cacheKey, qty, CONSUMPTION_CACHE_TTL);
    return qty;
  }

  private async getDailyConsumptionSeries(
    tenantId: string,
    warehouseId: string,
    productId: string,
    days: number,
  ): Promise<number[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [movementLines, outboundLines] = await Promise.all([
      this.prisma.movementLine.findMany({
        where: {
          tenantId,
          productId,
          movementHeader: {
            warehouseId,
            movementType: MovementType.OUTBOUND_SHIPMENT,
            createdAt: { gte: since },
          },
        } as any,
        select: { quantity: true, movementHeader: { select: { createdAt: true } } },
      }),
      this.prisma.outboundOrderLine.findMany({
        where: { tenantId, productId, outboundOrder: { warehouseId, createdAt: { gte: since } } } as any,
        select: { pickedQty: true, createdAt: true },
      }),
    ]);

    const perDay: Record<string, number> = {};
    const register = (date: Date, qty: Prisma.Decimal | number | null | undefined) => {
      const key = date.toISOString().slice(0, 10);
      perDay[key] = (perDay[key] ?? 0) + Number(qty ?? 0);
    };

    movementLines.forEach((l) => register(l.movementHeader.createdAt, l.quantity));
    outboundLines.forEach((l) => register(l.createdAt, l.pickedQty));

    return Object.values(perDay);
  }

  private calculateAbc(consumptions: Record<string, number>): Record<string, AbcClass> {
    const entries = Object.entries(consumptions).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((acc, [, qty]) => acc + qty, 0) || 1;
    let cumulative = 0;
    const result: Record<string, AbcClass> = {};
    for (const [productId, qty] of entries) {
      cumulative += qty;
      const ratio = cumulative / total;
      if (ratio <= 0.8) result[productId] = 'A';
      else if (ratio <= 0.95) result[productId] = 'B';
      else result[productId] = 'C';
    }
    return result;
  }

  private calculateXyz(series: Record<string, number[]>): Record<string, XyzClass> {
    const result: Record<string, XyzClass> = {};
    for (const [productId, values] of Object.entries(series)) {
      if (!values.length) {
        result[productId] = 'Z';
        continue;
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / Math.max(1, values.length - 1);
      const stdDev = Math.sqrt(variance);
      const coeffVar = mean === 0 ? Infinity : stdDev / mean;
      if (coeffVar <= 0.5) result[productId] = 'X';
      else if (coeffVar <= 1) result[productId] = 'Y';
      else result[productId] = 'Z';
    }
    return result;
  }

  private scoreBase(abc: AbcClass, xyz: XyzClass, rotation: number, dos: number): number {
    const abcScore = abc === 'A' ? 3 : abc === 'B' ? 2 : 1;
    const xyzScore = xyz === 'X' ? 3 : xyz === 'Y' ? 2 : 1;
    const rotationScore = Math.min(5, rotation * 2);
    const dosScore = Math.max(0, Math.min(5, 5 - Math.abs(dos - 5)));
    return abcScore * 2 + xyzScore * 1.5 + rotationScore + dosScore * 0.5;
  }

  private async buildDistanceMap(tenantId: string, warehouseId: string, locations: any[]) {
    const cacheKey = this.buildCacheKey('slotting:distance', [tenantId, warehouseId]);
    const cached = await this.cache.getJson<Record<string, number>>(cacheKey);
    if (cached) return cached;
    const sorted = [...locations].sort((a, b) => a.code.localeCompare(b.code));
    const map: Record<string, number> = {};
    sorted.forEach((loc, idx) => {
      map[loc.id] = idx;
    });
    await this.cache.setJson(cacheKey, map, DISTANCE_CACHE_TTL);
    return map;
  }

  private evaluateCompatibility(product: any, location: any, rules: any[]): { allowed: boolean; bonus: number } {
    const applicable = rules.filter((rule) => rule.locationId === location.id);
    if (!applicable.length) return { allowed: true, bonus: 0 };
    const productClass = (product as any).classCode || (product as any).category || undefined;
    let allowedRuleFound = false;
    for (const rule of applicable) {
      const matchesProduct = rule.productId && rule.productId === product.id;
      const matchesClass = rule.productClass && productClass && rule.productClass === productClass;
      const isBlock = rule.ruleType === CompatibilityType.BLOCK || rule.ruleType === 'BLOCK';
      const isAllow = rule.ruleType === CompatibilityType.ALLOW || rule.ruleType === 'ALLOW';
      if (isBlock && (matchesProduct || matchesClass || (!rule.productId && !rule.productClass))) {
        return { allowed: false, bonus: -5 };
      }
      if (isAllow && (matchesProduct || matchesClass || (!rule.productId && !rule.productClass))) {
        allowedRuleFound = true;
      }
    }
    return { allowed: true, bonus: allowedRuleFound ? 1.5 : 0 };
  }

  private evaluateLocationScore(
    product: any,
    baseScore: number,
    location: any,
    distanceMap: Record<string, number>,
    config: any,
    compatibilityBonus: number,
    isGolden: boolean,
  ) {
    const distancePenalty = (distanceMap[location.id] ?? 0) * 0.1;
    const zoneBonus = isGolden ? 3 : location.zone?.toUpperCase().includes('PICK') ? 1.5 : 0;
    const heavyBonus = config.heavyProductsZone && (product as any).isHeavy && location.zone?.toUpperCase().includes('HEAVY') ? 1 : 0;
    const fragileBonus =
      config.fragileProductsZone && (product as any).isFragile && location.zone?.toUpperCase().includes('FRAGILE') ? 1 : 0;
    const accessibilityPenalty = location.isActive === false ? 2 : 0;
    return baseScore + zoneBonus + compatibilityBonus + heavyBonus + fragileBonus - distancePenalty - accessibilityPenalty;
  }

  private findCurrentLocation(inventoryByProduct: Record<string, any[]>): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    for (const [productId, inventory] of Object.entries(inventoryByProduct)) {
      if (!inventory.length) continue;
      const sorted = [...inventory].sort((a, b) => Number(b.quantity) - Number(a.quantity));
      result[productId] = sorted[0].locationId;
    }
    return result;
  }

  async calculateSlotting(tenantId: string, dto: CalculateSlottingDto) {
    const config = await this.prisma.slottingConfig.findFirst({
      where: { tenantId, warehouseId: dto.warehouseId, isActive: true },
    });
    if (!config) {
      throw new NotFoundException('Slotting config not found for warehouse');
    }

    const locations = await this.prisma.location.findMany({
      where: { tenantId, warehouseId: dto.warehouseId, isActive: true },
    });
    const rules = await this.prisma.locationCompatibilityRule.findMany({ where: { tenantId, warehouseId: dto.warehouseId } });
    const distanceMap = await this.buildDistanceMap(tenantId, dto.warehouseId, locations);

    const inventoryRows = await this.prisma.inventory.findMany({
      where: { tenantId, location: { warehouseId: dto.warehouseId } } as any,
      include: { location: true },
    });

    const inventoryByProduct: Record<string, any[]> = {};
    inventoryRows.forEach((inv) => {
      inventoryByProduct[inv.productId] = inventoryByProduct[inv.productId] || [];
      inventoryByProduct[inv.productId].push(inv);
    });

    const productIds = dto.productId ? [dto.productId] : Array.from(new Set(inventoryRows.map((i) => i.productId)));
    if (!productIds.length) {
      return [];
    }
    const products = await this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } } });

    const consumptionMap: Record<string, number> = {};
    const xyzSeries: Record<string, number[]> = {};
    for (const product of products) {
      consumptionMap[product.id] = await this.getConsumption(tenantId, dto.warehouseId, product.id, config.abcPeriodDays);
      xyzSeries[product.id] = await this.getDailyConsumptionSeries(
        tenantId,
        dto.warehouseId,
        product.id,
        config.xyzPeriodDays,
      );
    }

    const abcClasses = this.calculateAbc(consumptionMap);
    const xyzClasses = this.calculateXyz(xyzSeries);
    const currentLocations = this.findCurrentLocation(inventoryByProduct);

    const candidates: any[] = [];
    const goldenZoneCount = config.goldenZoneLocations ?? Math.min(5, locations.length);
    const goldenZoneIds = new Set(locations.slice(0, goldenZoneCount).map((loc) => loc.id));

    for (const product of products) {
      const consumption = consumptionMap[product.id] ?? 0;
      const dailyConsumption = consumption / Math.max(1, config.abcPeriodDays);
      const inventoryQty = (inventoryByProduct[product.id] || []).reduce((sum, inv) => sum + Number(inv.quantity ?? 0), 0);
      const dos = dailyConsumption === 0 ? Infinity : inventoryQty / dailyConsumption;
      const rotation = dailyConsumption;
      const baseScore = this.scoreBase(abcClasses[product.id] ?? 'C', xyzClasses[product.id] ?? 'Z', rotation, dos);

      let best: any = null;
      for (const location of locations) {
        const { allowed, bonus } = this.evaluateCompatibility(product, location, rules);
        if (!allowed) continue;
        const score = this.evaluateLocationScore(
          product,
          baseScore,
          location,
          distanceMap,
          config,
          bonus,
          goldenZoneIds.has(location.id),
        );
        if (!best || score > best.score) {
          best = { location, score, reason: `ABC:${abcClasses[product.id]} XYZ:${xyzClasses[product.id]}` };
        }
      }

      if (!best || (!dto.force && best.score <= 0)) {
        continue;
      }
      candidates.push({
        productId: product.id,
        warehouseId: dto.warehouseId,
        score: best.score,
        locationId: best.location.id,
        reason: best.reason,
        currentLocationId: currentLocations[product.id],
      });
    }

    const sorted = candidates.sort((a, b) => b.score - a.score);
    const limited = dto.limitResults ? sorted.slice(0, dto.limitResults) : sorted;
    const recommendations = [] as any[];
    for (const rec of limited) {
      const created = await this.prisma.slottingRecommendation.create({
        data: {
          tenantId,
          productId: rec.productId,
          warehouseId: rec.warehouseId,
          currentLocationId: rec.currentLocationId,
          recommendedLocationId: rec.locationId,
          reason: rec.reason,
          score: new Prisma.Decimal(rec.score),
          status: SlottingStatus.PENDING,
        },
      });
      recommendations.push(created);
    }

    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'SLOTTING',
      action: 'CALCULATE',
      metadata: dto,
    });

    return recommendations;
  }

  listRecommendations(tenantId: string, warehouseId?: string) {
    return this.prisma.slottingRecommendation.findMany({
      where: { tenantId, ...(warehouseId ? { warehouseId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRecommendation(tenantId: string, dto: ApproveSlottingDto) {
    const recommendation = await this.prisma.slottingRecommendation.findFirst({
      where: { id: dto.recommendationId, tenantId },
    });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }
    const status = dto.approve ? SlottingStatus.APPROVED : SlottingStatus.REJECTED;
    const updated = await this.prisma.slottingRecommendation.update({
      where: { id: recommendation.id },
      data: { status },
    });

    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'SLOTTING',
      action: 'APPROVE',
      entityId: recommendation.id,
      metadata: { approve: dto.approve },
    });

    return updated;
  }

  async executeRecommendation(tenantId: string, recommendationId: string) {
    const recommendation = await this.prisma.slottingRecommendation.findFirst({
      where: { id: recommendationId, tenantId },
      include: { product: true },
    });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    const qtyRow = await this.prisma.inventory.aggregate({
      where: {
        tenantId,
        productId: recommendation.productId,
        ...(recommendation.currentLocationId ? { locationId: recommendation.currentLocationId } : {}),
      },
      _sum: { quantity: true },
    });
    const quantityToMove = Number(qtyRow._sum.quantity ?? 0);
    const uom = recommendation.product.defaultUom;

    const result = await this.prisma.$transaction(async (tx) => {
      const header = await tx.movementHeader.create({
        data: {
          tenantId,
          movementType: MovementType.INTERNAL_TRANSFER,
          warehouseId: recommendation.warehouseId,
          status: MovementStatus.COMPLETED,
          reference: `SLOTTING-${recommendation.id}`,
          lines: {
            create: {
              tenantId,
              productId: recommendation.productId,
              fromLocationId: recommendation.currentLocationId,
              toLocationId: recommendation.recommendedLocationId,
              quantity: new Prisma.Decimal(quantityToMove),
              uom,
            },
          },
        },
      });

      if (quantityToMove > 0 && recommendation.currentLocationId) {
        const currentInv = await tx.inventory.findFirst({
          where: { tenantId, productId: recommendation.productId, locationId: recommendation.currentLocationId },
        });
        if (currentInv) {
          await tx.inventory.update({
            where: { id: currentInv.id },
            data: { quantity: new Prisma.Decimal(Math.max(0, Number(currentInv.quantity) - quantityToMove)) },
          });
        }
      }

      if (quantityToMove > 0) {
        const targetInv = await tx.inventory.findFirst({
          where: { tenantId, productId: recommendation.productId, locationId: recommendation.recommendedLocationId },
        });
        if (targetInv) {
          await tx.inventory.update({
            where: { id: targetInv.id },
            data: { quantity: new Prisma.Decimal(Number(targetInv.quantity) + quantityToMove) },
          });
        } else {
          await tx.inventory.create({
            data: {
              tenantId,
              productId: recommendation.productId,
              warehouseId: recommendation.warehouseId,
              locationId: recommendation.recommendedLocationId,
              quantity: new Prisma.Decimal(quantityToMove),
              uom,
              stockStatus: StockStatus.AVAILABLE,
            },
          });
        }
      }

      const updated = await tx.slottingRecommendation.update({
        where: { id: recommendation.id },
        data: { status: SlottingStatus.EXECUTED },
      });

      return { header, updated };
    });

    await this.audit.recordLog({
      tenantId,
      userId: undefined,
      resource: 'SLOTTING',
      action: 'EXECUTE',
      entityId: recommendation.id,
    });

    return result.updated;
  }
}
