import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Warehouse } from '../../domain/entities/warehouse.entity';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { CreateWarehouseCommand, WarehouseQuery } from '../../application/dto/warehouse-commands.dto';

@Injectable()
export class PrismaWarehouseRepository implements WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateWarehouseCommand): Promise<Warehouse> {
    const record = await this.prisma.warehouse.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findUnique({ where: { code } });
    return record ? this.toDomain(record) : null;
  }

  async update(id: string, data: { name?: string; isActive?: boolean }): Promise<Warehouse> {
    const record = await this.prisma.warehouse.update({
      where: { id },
      data,
    });

    return this.toDomain(record);
  }

  async list(query: WarehouseQuery): Promise<{ data: Warehouse[]; total: number }> {
    const { page, limit, code, name, isActive } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(code ? { code: { contains: code, mode: 'insensitive' as const } } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' as const } } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      data: records.map((record) => this.toDomain(record)),
      total,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.warehouse.update({
      where: { id },
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
  }): Warehouse {
    return new Warehouse(
      record.id,
      record.code,
      record.name,
      record.isActive,
      record.createdAt,
      record.updatedAt,
    );
  }
}
