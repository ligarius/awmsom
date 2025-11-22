import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTenantDto) {
    const prisma = this.prisma as any;
    return prisma.tenant.create({ data: dto });
  }

  findAll() {
    const prisma = this.prisma as any;
    return prisma.tenant.findMany();
  }

  async findOne(id: string) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    const prisma = this.prisma as any;
    return prisma.tenant.update({ where: { id }, data: dto });
  }
}
