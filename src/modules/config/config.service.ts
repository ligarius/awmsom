import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PickingMethodType, TenantConfig, ZoneType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto';
import { UpsertPickingMethodConfigDto } from './dto/upsert-picking-method-config.dto';
import { UpsertWarehouseZoneConfigDto } from './dto/upsert-warehouse-zone-config.dto';
import { UpsertInventoryPolicyDto } from './dto/upsert-inventory-policy.dto';
import { UpsertOutboundRuleDto } from './dto/upsert-outbound-rule.dto';

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const existing = await this.prisma.tenantConfig.findFirst({ where: { tenantId } });
    if (existing) {
      return existing;
    }

    return this.prisma.tenantConfig.create({
      data: { tenantId },
    });
  }

  async updateTenantConfig(tenantId: string, dto: UpdateTenantConfigDto): Promise<TenantConfig> {
    const existing = await this.prisma.tenantConfig.findFirst({ where: { tenantId } });
    if (existing) {
      return this.prisma.tenantConfig.update({ where: { id: existing.id }, data: dto });
    }

    return this.prisma.tenantConfig.create({ data: { tenantId, ...dto } });
  }

  async getPickingMethods(tenantId: string, warehouseId?: string) {
    return this.prisma.pickingMethodConfig.findMany({
      where: { tenantId, warehouseId: warehouseId ?? undefined },
    });
  }

  async upsertPickingMethod(tenantId: string, dto: UpsertPickingMethodConfigDto) {
    if (dto.warehouseId) {
      await this.assertWarehouseOwnership(tenantId, dto.warehouseId);
    }

    if (!Object.values(PickingMethodType).includes(dto.method)) {
      throw new BadRequestException('Invalid picking method');
    }

    const warehouseId = dto.warehouseId ?? null;

    if (dto.isDefault) {
      await this.prisma.pickingMethodConfig.updateMany({
        where: { tenantId, warehouseId },
        data: { isDefault: false },
      });
    }

    const existing = await this.prisma.pickingMethodConfig.findFirst({
      where: { tenantId, warehouseId, method: dto.method },
    });

    if (existing) {
      return this.prisma.pickingMethodConfig.update({
        where: { id: existing.id },
        data: { ...dto, tenantId, warehouseId },
      });
    }

    return this.prisma.pickingMethodConfig.create({ data: { tenantId, ...dto, warehouseId } });
  }

  async getWarehouseZones(tenantId: string, warehouseId: string) {
    await this.assertWarehouseOwnership(tenantId, warehouseId);
    return this.prisma.warehouseZoneConfig.findMany({ where: { tenantId, warehouseId } });
  }

  async upsertWarehouseZone(tenantId: string, dto: UpsertWarehouseZoneConfigDto) {
    await this.assertWarehouseOwnership(tenantId, dto.warehouseId);

    if (!Object.values(ZoneType).includes(dto.zoneType)) {
      throw new BadRequestException('Invalid zone type');
    }

    if (dto.id) {
      const existing = await this.prisma.warehouseZoneConfig.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Zone not found');
      }

      if (existing.warehouseId !== dto.warehouseId) {
        throw new BadRequestException('Cannot move zone to another warehouse');
      }

      return this.prisma.warehouseZoneConfig.update({
        where: { id: dto.id },
        data: { ...dto, tenantId },
      });
    }

    return this.prisma.warehouseZoneConfig.create({ data: { tenantId, ...dto } });
  }

  async getInventoryPolicies(tenantId: string, warehouseId?: string, productId?: string) {
    return this.prisma.inventoryPolicy.findMany({
      where: { tenantId, warehouseId: warehouseId ?? undefined, productId: productId ?? undefined },
    });
  }

  async resolveInventoryPolicy(tenantId: string, warehouseId?: string, productId?: string) {
    const candidates = await this.prisma.inventoryPolicy.findMany({
      where: {
        tenantId,
        OR: [
          { warehouseId: warehouseId ?? undefined, productId: productId ?? undefined },
          { warehouseId: warehouseId ?? undefined, productId: null },
          { warehouseId: null, productId: productId ?? undefined },
          { warehouseId: null, productId: null },
        ],
      },
      orderBy: [
        { productId: 'desc' },
        { warehouseId: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return candidates[0] ?? null;
  }

  async upsertInventoryPolicy(tenantId: string, dto: UpsertInventoryPolicyDto) {
    if (dto.warehouseId) {
      await this.assertWarehouseOwnership(tenantId, dto.warehouseId);
    }

    if (dto.productId) {
      await this.assertProductOwnership(tenantId, dto.productId);
    }

    if (dto.id) {
      const existing = await this.prisma.inventoryPolicy.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Inventory policy not found');
      }

      return this.prisma.inventoryPolicy.update({ where: { id: dto.id }, data: { ...dto, tenantId } });
    }

    const existing = await this.prisma.inventoryPolicy.findFirst({
      where: { tenantId, warehouseId: dto.warehouseId ?? null, productId: dto.productId ?? null },
    });

    if (existing) {
      return this.prisma.inventoryPolicy.update({ where: { id: existing.id }, data: { ...dto, tenantId } });
    }

    return this.prisma.inventoryPolicy.create({ data: { tenantId, ...dto } });
  }

  async getOutboundRule(tenantId: string, warehouseId?: string) {
    if (warehouseId) {
      const specific = await this.prisma.outboundRule.findFirst({ where: { tenantId, warehouseId } });
      if (specific) {
        return specific;
      }
    }

    return this.prisma.outboundRule.findFirst({ where: { tenantId, warehouseId: null } });
  }

  async upsertOutboundRule(tenantId: string, dto: UpsertOutboundRuleDto) {
    if (dto.warehouseId) {
      await this.assertWarehouseOwnership(tenantId, dto.warehouseId);
    }

    if (dto.defaultPickingMethod && !Object.values(PickingMethodType).includes(dto.defaultPickingMethod)) {
      throw new BadRequestException('Invalid picking method');
    }

    const targetWarehouseId = dto.warehouseId ?? null;

    if (dto.id) {
      const existing = await this.prisma.outboundRule.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Outbound rule not found');
      }

      return this.prisma.outboundRule.update({ where: { id: dto.id }, data: { ...dto, tenantId } });
    }

    const existing = await this.prisma.outboundRule.findFirst({ where: { tenantId, warehouseId: targetWarehouseId } });

    if (existing) {
      return this.prisma.outboundRule.update({ where: { id: existing.id }, data: { ...dto, tenantId } });
    }

    return this.prisma.outboundRule.create({ data: { tenantId, warehouseId: targetWarehouseId, ...dto } });
  }

  private async assertWarehouseOwnership(tenantId: string, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
    if (!warehouse) {
      throw new BadRequestException('Warehouse does not belong to tenant');
    }
    return warehouse;
  }

  private async assertProductOwnership(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) {
      throw new BadRequestException('Product does not belong to tenant');
    }
    return product;
  }
}
