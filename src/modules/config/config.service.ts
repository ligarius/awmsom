import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PickingMethodType, TenantConfig, ZoneType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto';
import { UpsertPickingMethodConfigDto } from './dto/upsert-picking-method-config.dto';
import { UpsertWarehouseZoneConfigDto } from './dto/upsert-warehouse-zone-config.dto';
import { UpsertInventoryPolicyDto } from './dto/upsert-inventory-policy.dto';
import { UpsertOutboundRuleDto } from './dto/upsert-outbound-rule.dto';
import { UpsertMovementReasonDto } from './dto/upsert-movement-reason.dto';
import { DEFAULT_MOVEMENT_REASONS } from './movement-reasons.constants';

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

  async getMovementReasons(tenantId: string) {
    const existing = await this.prisma.movementReasonConfig.findMany({
      where: { tenantId },
      orderBy: { label: 'asc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    await this.seedDefaultMovementReasons(tenantId);
    return this.prisma.movementReasonConfig.findMany({
      where: { tenantId },
      orderBy: { label: 'asc' },
    });
  }

  async upsertMovementReason(tenantId: string, dto: UpsertMovementReasonDto) {
    const code = dto.code.trim().toUpperCase();
    const label = dto.label.trim();

    if (!code || !label) {
      throw new BadRequestException('code and label are required');
    }

    if (dto.isDefault) {
      await this.prisma.movementReasonConfig.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      });
    }

    if (dto.id) {
      const existing = await this.prisma.movementReasonConfig.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Movement reason not found');
      }

      if (existing.code !== code) {
        const duplicate = await this.prisma.movementReasonConfig.findFirst({ where: { tenantId, code } });
        if (duplicate) {
          throw new BadRequestException('Movement reason code already exists');
        }
      }

      return this.prisma.movementReasonConfig.update({
        where: { id: existing.id },
        data: {
          code,
          label,
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? existing.isActive,
          isDefault: dto.isDefault ?? existing.isDefault,
        },
      });
    }

    const existingByCode = await this.prisma.movementReasonConfig.findFirst({ where: { tenantId, code } });
    if (existingByCode) {
      return this.prisma.movementReasonConfig.update({
        where: { id: existingByCode.id },
        data: {
          label,
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? existingByCode.isActive,
          isDefault: dto.isDefault ?? existingByCode.isDefault,
        },
      });
    }

    return this.prisma.movementReasonConfig.create({
      data: {
        tenantId,
        code,
        label,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
      },
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

  private async seedDefaultMovementReasons(tenantId: string) {
    const existing = await this.prisma.movementReasonConfig.findMany({ where: { tenantId } });
    if (existing.length > 0) {
      return;
    }

    await this.prisma.movementReasonConfig.createMany({
      data: DEFAULT_MOVEMENT_REASONS.map((reason) => ({
        tenantId,
        code: reason.code,
        label: reason.label,
        description: reason.description ?? null,
        isActive: true,
        isDefault: reason.isDefault ?? false,
      })),
    });
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
