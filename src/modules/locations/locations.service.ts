import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: { warehouseId: string; code: string; description?: string; zone?: string }) {
    const tenantId = this.tenantContext.getTenantId();
    await this.ensureWarehouseOwnership(data.warehouseId, tenantId);
    await this.assertUniqueCode(tenantId, data.warehouseId, data.code);

    return this.prisma.location.create({
      data: {
        ...data,
        tenantId,
        zone: data.zone ?? 'DEFAULT',
      },
    });
  }

  async list() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.location.findMany({ where: { tenantId } });
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const location = await this.prisma.location.findFirst({ where: { id, tenantId } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  async update(id: string, data: { warehouseId?: string; code?: string; description?: string; zone?: string }) {
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.prisma.location.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    const warehouseId = data.warehouseId ?? existing.warehouseId;
    await this.ensureWarehouseOwnership(warehouseId, tenantId);

    const targetCode = data.code ?? existing.code;
    if (data.code || data.warehouseId) {
      await this.assertUniqueCode(tenantId, warehouseId, targetCode, id);
    }

    return this.prisma.location.update({
      where: { id },
      data: {
        warehouseId,
        code: targetCode,
        description: data.description ?? existing.description,
        zone: data.zone ?? existing.zone,
      },
    });
  }

  async remove(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.prisma.location.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.location.delete({ where: { id } });
  }

  async suggest(warehouseId: string) {
    const tenantId = this.tenantContext.getTenantId();
    if (!warehouseId) {
      throw new BadRequestException('Warehouse is required');
    }

    await this.ensureWarehouseOwnership(warehouseId, tenantId);

    const location = await this.prisma.location.findFirst({
      where: { tenantId, warehouseId, isActive: true },
      orderBy: { code: 'asc' },
    });

    if (!location) {
      throw new NotFoundException('No locations available');
    }

    return {
      code: location.code,
      distance: 'N/A',
      reason: 'Ubicación sugerida por disponibilidad',
    };
  }

  private async ensureWarehouseOwnership(warehouseId: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
    if (!warehouse) {
      throw new BadRequestException('Warehouse does not belong to tenant');
    }
  }

  private async assertUniqueCode(
    tenantId: string,
    warehouseId: string,
    code: string,
    ignoreId?: string,
  ) {
    const duplicate = await this.prisma.location.findFirst({
      where: { tenantId, warehouseId, code, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    });

    if (duplicate) {
      throw new ConflictException('Location code already exists in warehouse');
    }
  }
}
