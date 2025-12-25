import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { InventoryService } from './inventory.service';
import { CreateAdjustmentDto } from './dto/adjustment-legacy.dto';

@Controller('adjustments')
export class AdjustmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  @Permissions(PermissionResource.ADJUSTMENT, PermissionAction.READ)
  async list(@Query('page') page = '1', @Query('limit') limit = '20') {
    const tenantId = this.tenantContext.getTenantId();
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const [total, adjustments] = await this.prisma.$transaction([
      this.prisma.inventoryAdjustment.count({ where: { tenantId } }),
      this.prisma.inventoryAdjustment.findMany({
        where: { tenantId },
        include: { product: true, location: true, batch: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: adjustments.map((adjustment) => this.mapAdjustment(adjustment)),
      total,
      page: pageNumber,
      pageSize,
    };
  }

  @Get(':id')
  @Permissions(PermissionResource.ADJUSTMENT, PermissionAction.READ)
  async get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const adjustment = await this.prisma.inventoryAdjustment.findFirst({
      where: { id, tenantId },
      include: { product: true, location: true, batch: true },
    });
    if (!adjustment) {
      throw new NotFoundException('Adjustment not found');
    }
    return this.mapAdjustment(adjustment);
  }

  @Post()
  @Permissions(PermissionResource.ADJUSTMENT, PermissionAction.CREATE)
  async create(@Body() dto: CreateAdjustmentDto, @Req() request: any) {
    const tenantId = this.tenantContext.getTenantId();
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        OR: [{ id: dto.productId }, { sku: dto.productId }],
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const location = await this.prisma.location.findFirst({
      where: {
        tenantId,
        OR: [{ id: dto.location }, { code: dto.location }],
      },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const batch = dto.batch
      ? await this.prisma.batch.findFirst({
        where: {
          tenantId,
          productId: product.id,
          OR: [{ batchCode: dto.batch }, { code: dto.batch }],
        },
      })
      : null;

    if (dto.batch && !batch) {
      throw new NotFoundException('Batch not found');
    }

    const inventoryAgg = await this.prisma.inventory.aggregate({
      where: {
        tenantId,
        productId: product.id,
        locationId: location.id,
        batchId: batch?.id ?? null,
      },
      _sum: { quantity: true },
    });
    const currentQty = Number(inventoryAgg._sum.quantity ?? 0);
    const newQty =
      dto.type === 'AUMENTO'
        ? currentQty + dto.quantity
        : Math.max(0, currentQty - dto.quantity);

    const createdBy = request.user?.id ?? request.user?.sub ?? 'system';
    await this.inventoryService.applyInventoryAdjustment(
      {
        warehouseId: location.warehouseId,
        productId: product.id,
        batchId: batch?.id,
        locationId: location.id,
        newQty,
        uom: product.defaultUom,
        reason: dto.reason,
        reference: dto.comment,
        createdBy,
      },
      this.prisma,
      tenantId,
    );

    const adjustment = await this.prisma.inventoryAdjustment.findFirst({
      where: { tenantId, productId: product.id, locationId: location.id },
      include: { product: true, location: true, batch: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment not found after creation');
    }

    return this.mapAdjustment(adjustment);
  }

  private mapAdjustment(adjustment: any) {
    const difference = Number(adjustment.differenceQty ?? 0);
    const type = difference >= 0 ? 'AUMENTO' : 'DISMINUCION';

    return {
      id: adjustment.id,
      code: adjustment.id,
      type,
      productId: adjustment.productId,
      sku: adjustment.product?.sku ?? adjustment.productId,
      productName: adjustment.product?.name,
      quantity: Math.abs(difference),
      batch: adjustment.batch?.batchCode ?? adjustment.batch?.code ?? null,
      locationCode: adjustment.location?.code,
      reason: adjustment.reason,
      comment: adjustment.reference ?? undefined,
      user: adjustment.createdBy ?? undefined,
      createdAt: adjustment.createdAt ? new Date(adjustment.createdAt).toISOString() : undefined,
    };
  }
}
