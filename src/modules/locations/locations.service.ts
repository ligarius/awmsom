import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: { warehouseId: string; code: string; description?: string }) {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;
    const warehouse = await prisma.warehouse.findFirst({ where: { id: data.warehouseId, tenantId } });
    if (!warehouse) {
      throw new BadRequestException('Warehouse does not belong to tenant');
    }

    return prisma.location.create({
      data: {
        ...data,
        tenantId,
        zone: 'DEFAULT',
      },
    });
  }

  async list() {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;
    return prisma.location.findMany({ where: { tenantId } });
  }
}
