import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Warehouse } from '../../domain/entities/warehouse.entity';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { CreateWarehouseCommand, WarehouseQuery } from '../../application/dto/warehouse-commands.dto';
import { TenantContextService } from '../../../../common/tenant-context.service';

@Injectable()
export class PrismaWarehouseRepository implements WarehouseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: CreateWarehouseCommand): Promise<Warehouse> {
    const tenantId = data.tenantId ?? this.tenantContext.getTenantId();
    const prisma = this.prisma as any;
    const record = await prisma.warehouse.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        tenantId,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<Warehouse | null> {
    const prisma = this.prisma as any;
    const record = await prisma.warehouse.findFirst({
      where: { id, tenantId: this.tenantContext.getTenantId() },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const prisma = this.prisma as any;
    const record = await prisma.warehouse.findFirst({
      where: { code, tenantId: this.tenantContext.getTenantId() },
    });
    return record ? this.toDomain(record) : null;
  }

  async update(
    id: string,
    data: { name?: string; isActive?: boolean; updatedBy?: string },
  ): Promise<Warehouse> {
    const prisma = this.prisma as any;
    const record = await prisma.warehouse.update({
      where: { id, tenantId: this.tenantContext.getTenantId() },
      data,
    });

    return this.toDomain(record);
  }

  async list(query: WarehouseQuery): Promise<{ data: Warehouse[]; total: number }> {
    const { page, limit, code, name, isActive } = query;
    const skip = (page - 1) * limit;
    const tenantId = this.tenantContext.getTenantId();
    const where = {
      tenantId,
      ...(code ? { code: { contains: code, mode: 'insensitive' as const } } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' as const } } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };

    const prisma = this.prisma as any;
    const [records, total] = await prisma.$transaction([
      prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.warehouse.count({ where }),
    ]);

    return {
      data: records.map((record: any) => this.toDomain(record)),
      total,
    };
  }

  async delete(id: string): Promise<void> {
    const prisma = this.prisma as any;
    await prisma.warehouse.update({
      where: { id, tenantId: this.tenantContext.getTenantId() },
      data: { isActive: false },
    });
  }

  private toDomain(record: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
    tenantId?: string;
  }): Warehouse {
    return new Warehouse(
      record.id,
      record.code,
      record.name,
      record.isActive,
      record.createdAt,
      record.updatedAt,
      record.createdBy ?? undefined,
      record.updatedBy ?? undefined,
    );
  }
}
