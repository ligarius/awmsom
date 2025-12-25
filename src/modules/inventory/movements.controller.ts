import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { RegisterInventoryMovementUseCase } from './application/use-cases/register-inventory-movement.use-case';
import { CreateMovementDto } from './dto/movement-legacy.dto';

@Controller('movements')
export class MovementsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly registerMovement: RegisterInventoryMovementUseCase,
  ) {}

  @Get()
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  async list(@Query('page') page = '1', @Query('limit') limit = '20') {
    const tenantId = this.tenantContext.getTenantId();
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const [total, movements] = await this.prisma.$transaction([
      this.prisma.movementLine.count({ where: { tenantId } }),
      this.prisma.movementLine.findMany({
        where: { tenantId },
        include: {
          movementHeader: { include: { warehouse: true, reason: true } },
          product: true,
          fromLocation: true,
          toLocation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: movements.map((movement) => this.mapMovement(movement)),
      total,
      page: pageNumber,
      pageSize,
    };
  }

  @Get(':id')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  async get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const movement = await this.prisma.movementLine.findFirst({
      where: { id, tenantId },
      include: {
        movementHeader: { include: { warehouse: true, reason: true } },
        product: true,
        fromLocation: true,
        toLocation: true,
      },
    });
    if (!movement) {
      throw new NotFoundException('Movement not found');
    }
    return this.mapMovement(movement);
  }

  @Post()
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  async create(@Body() dto: CreateMovementDto, @Req() request: any) {
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

    const fromLocation = await this.prisma.location.findFirst({
      where: {
        tenantId,
        OR: [{ id: dto.fromLocation }, { code: dto.fromLocation }],
      },
    });
    if (!fromLocation) {
      throw new NotFoundException('Origin location not found');
    }

    const toLocation = await this.prisma.location.findFirst({
      where: {
        tenantId,
        OR: [{ id: dto.toLocation }, { code: dto.toLocation }],
      },
    });
    if (!toLocation) {
      throw new NotFoundException('Destination location not found');
    }

    const createdBy = request.user?.id ?? request.user?.sub ?? 'system';
    const requestedReason = dto.reasonCode?.trim() || dto.reason?.trim();
    let reasonId: string | undefined;

    if (requestedReason) {
      const reason = await this.prisma.movementReasonConfig.findFirst({
        where: { tenantId, code: requestedReason.toUpperCase(), isActive: true },
      });
      if (!reason) {
        throw new BadRequestException('Invalid movement reason');
      }
      reasonId = reason.id;
    } else {
      const defaultReason = await this.prisma.movementReasonConfig.findFirst({
        where: { tenantId, isDefault: true, isActive: true },
      });
      reasonId = defaultReason?.id;
    }

    const movement = await this.registerMovement.execute({
      productId: product.id,
      quantity: dto.quantity,
      uom: product.defaultUom,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      createdBy,
      reasonId,
      notes: dto.notes?.trim() || undefined,
    });

    const saved = await this.prisma.movementLine.findFirst({
      where: { id: movement.id, tenantId },
      include: {
        movementHeader: { include: { warehouse: true, reason: true } },
        product: true,
        fromLocation: true,
        toLocation: true,
      },
    });

    if (!saved) {
      throw new NotFoundException('Movement not found after creation');
    }

    return this.mapMovement(saved);
  }

  private mapMovement(movement: any) {
    const createdAt = movement.movementHeader?.createdAt ?? movement.createdAt;
    const movementType = movement.movementHeader?.movementType ?? 'INTERNAL_TRANSFER';

    const warehouseName = movement.movementHeader?.warehouse?.name;
    return {
      id: movement.id,
      type: this.mapMovementType(movementType),
      productId: movement.productId,
      sku: movement.product?.sku ?? movement.productId,
      productName: movement.product?.name,
      quantity: Number(movement.quantity ?? 0),
      fromWarehouseId: movement.fromLocation?.warehouseId ?? movement.movementHeader?.warehouseId,
      toWarehouseId: movement.toLocation?.warehouseId ?? movement.movementHeader?.warehouseId,
      fromWarehouseName: warehouseName,
      toWarehouseName: warehouseName,
      fromLocation: movement.fromLocation?.code ?? movement.fromLocationId ?? undefined,
      toLocation: movement.toLocation?.code ?? movement.toLocationId ?? undefined,
      user: movement.movementHeader?.createdBy ?? undefined,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
      reasonCode: movement.movementHeader?.reason?.code ?? undefined,
      reason: movement.movementHeader?.reason?.label ?? movement.movementHeader?.reference ?? undefined,
      notes: movement.movementHeader?.notes ?? undefined,
    };
  }

  private mapMovementType(type: string) {
    switch (type) {
      case 'INTERNAL_TRANSFER':
        return 'INTERNAL_TRANSFER';
      case 'ADJUSTMENT':
        return 'MANUAL';
      case 'INBOUND_RECEIPT':
        return 'REPLENISHMENT';
      case 'OUTBOUND_SHIPMENT':
        return 'BALANCING';
      default:
        return 'MANUAL';
    }
  }
}
