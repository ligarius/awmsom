import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import { CycleCountStatus, PermissionAction, PermissionResource, Prisma } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { InventoryService } from './inventory.service';
import { CreateCycleCountLegacyDto, CycleCountExecuteDto, CycleCountReviewDto } from './dto/cycle-count-legacy.dto';

@Controller('cycle-count')
export class CycleCountController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.READ)
  async list(@Query('page') page = '1', @Query('limit') limit = '20') {
    const tenantId = this.tenantContext.getTenantId();
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.cycleCountTask.count({ where: { tenantId } }),
      this.prisma.cycleCountTask.findMany({
        where: { tenantId },
        include: {
          warehouse: true,
          lines: { include: { location: true, product: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: tasks.map((task) => this.mapTask(task)),
      total,
      page: pageNumber,
      pageSize,
    };
  }

  @Get(':id')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.READ)
  async get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.cycleCountTask.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: true,
        lines: { include: { location: true, product: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Cycle count task not found');
    }

    return this.mapTask(task);
  }

  @Post()
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.CREATE)
  async create(@Body() dto: CreateCycleCountLegacyDto, @Req() request: any) {
    const tenantId = this.tenantContext.getTenantId();
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        tenantId,
        OR: [{ id: dto.warehouseId }, { code: dto.warehouseId }],
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const locationFilters: Prisma.LocationWhereInput = {
      tenantId,
      warehouseId: warehouse.id,
    };

    if (dto.locations?.length) {
      locationFilters.code = { in: dto.locations };
    }
    if (dto.zones?.length) {
      locationFilters.zone = { in: dto.zones };
    }

    const locations = await this.prisma.location.findMany({ where: locationFilters });
    const locationIds = locations.map((loc) => loc.id);

    const productFilters: Prisma.ProductWhereInput = { tenantId };
    if (dto.products?.length) {
      productFilters.OR = [{ sku: { in: dto.products } }, { id: { in: dto.products } }];
    }
    const products = dto.products?.length ? await this.prisma.product.findMany({ where: productFilters }) : [];
    const productIds = products.map((product) => product.id);

    const inventoryFilters: Prisma.InventoryWhereInput = {
      tenantId,
      locationId: locationIds.length ? { in: locationIds } : undefined,
      productId: productIds.length ? { in: productIds } : undefined,
    };

    const inventory = await this.prisma.inventory.findMany({
      where: inventoryFilters,
      include: { product: true, location: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const linesData = inventory.map((record) => ({
      tenantId,
      productId: record.productId,
      locationId: record.locationId,
      batchId: record.batchId ?? undefined,
      uom: record.uom,
      expectedQty: new Prisma.Decimal(record.quantity ?? 0),
    }));

    const createdBy = dto.assignedTo ?? request.user?.id ?? request.user?.sub ?? 'system';
    const task = await this.prisma.cycleCountTask.create({
      data: {
        tenantId,
        warehouseId: warehouse.id,
        status: CycleCountStatus.PENDING,
        createdBy,
        lines: linesData.length
          ? {
              create: linesData,
            }
          : undefined,
      },
      include: {
        warehouse: true,
        lines: { include: { location: true, product: true } },
      },
    });

    return this.mapTask(task);
  }

  @Post(':id/execute')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.UPDATE)
  async execute(@Param('id') id: string, @Body() dto: CycleCountExecuteDto) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.cycleCountTask.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { location: true } } },
    });

    if (!task) {
      throw new NotFoundException('Cycle count task not found');
    }

    const lineMap = new Map<string, string>();
    task.lines.forEach((line) => {
      const key = `${line.productId}:${line.location?.code ?? line.locationId}`;
      lineMap.set(key, line.id);
    });

    const submitLines = dto.lines
      .filter((line) => line.counted !== undefined)
      .map((line) => {
        const key = `${line.productId}:${line.location}`;
        const lineId = lineMap.get(key);
        if (!lineId) return null;
        return { lineId, countedQty: line.counted as number };
      })
      .filter((line): line is { lineId: string; countedQty: number } => Boolean(line));

    if (!submitLines.length) {
      throw new NotFoundException('No matching lines to submit');
    }

    await this.inventoryService.submitCycleCount(id, { lines: submitLines });
    return { message: 'Cycle count submitted' };
  }

  @Post(':id/review')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.APPROVE)
  async review(@Param('id') id: string, @Body() dto: CycleCountReviewDto) {
    const tenantId = this.tenantContext.getTenantId();
    if (!dto.approve) {
      await this.prisma.cycleCountTask.update({
        where: { id, tenantId },
        data: { status: CycleCountStatus.CANCELLED },
      });
      return { message: 'Cycle count rejected' };
    }

    return { message: 'Cycle count approved' };
  }

  private mapTask(task: any) {
    const zones = new Set<string>();

    task.lines.forEach((line: any) => {
      if (line.location?.zone) zones.add(line.location.zone);
    });

    return {
      id: task.id,
      code: task.id,
      warehouseName: task.warehouse?.name,
      zones: Array.from(zones),
      assignedTo: task.createdBy ?? undefined,
      status: this.mapStatus(task.status),
      createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
      lines: task.lines.map((line: any) => ({
        location: line.location?.code ?? line.locationId,
        productId: line.productId,
        sku: line.product?.sku ?? line.productId,
        productName: line.product?.name,
        theoretical: Number(line.expectedQty ?? 0),
        counted: line.countedQty ? Number(line.countedQty) : undefined,
      })),
    };
  }

  private mapStatus(status: CycleCountStatus) {
    switch (status) {
      case CycleCountStatus.IN_PROGRESS:
        return 'COUNTING';
      case CycleCountStatus.COMPLETED:
        return 'CLOSED';
      case CycleCountStatus.CANCELLED:
        return 'CLOSED';
      default:
        return 'PENDING';
    }
  }
}
