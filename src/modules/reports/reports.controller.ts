import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('inbound')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async inbound(@Query() _filters: Record<string, string>) {
    const tenantId = this.tenantContext.getTenantId();
    const receipts = await this.prisma.inboundReceipt.findMany({
      where: { tenantId },
      include: { warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return receipts.map((receipt) => ({
      id: receipt.id,
      reference: receipt.externalRef ?? receipt.id,
      date: receipt.createdAt,
      status: receipt.status,
      warehouse: receipt.warehouse?.name,
    }));
  }

  @Get('outbound')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async outbound(@Query() _filters: Record<string, string>) {
    const tenantId = this.tenantContext.getTenantId();
    const orders = await this.prisma.outboundOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return orders.map((order) => ({
      id: order.id,
      reference: order.externalRef ?? order.id,
      date: order.createdAt,
      status: order.status,
      customer: order.customerRef ?? undefined,
      type: 'orden',
    }));
  }

  @Get('inventory')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async inventory(@Query() _filters: Record<string, string>) {
    const tenantId = this.tenantContext.getTenantId();
    const rows = await this.prisma.inventory.findMany({
      where: { tenantId },
      include: { product: true, location: true, batch: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return rows.map((row) => ({
      id: row.id,
      reference: row.product?.sku ?? row.productId,
      date: row.updatedAt,
      status: row.stockStatus,
      warehouse: row.location?.code,
      customer: row.batch?.batchCode ?? undefined,
      amount: Number(row.quantity ?? 0),
    }));
  }

  @Get('movements')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async movements(@Query() _filters: Record<string, string>) {
    const tenantId = this.tenantContext.getTenantId();
    const movements = await this.prisma.movementHeader.findMany({
      where: { tenantId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return movements.map((movement) => ({
      id: movement.id,
      reference: movement.reference ?? movement.id,
      date: movement.createdAt,
      status: movement.status,
      type: movement.movementType,
      customer: movement.createdBy ?? undefined,
      amount: movement.lines.reduce((sum, line) => sum + Number(line.quantity ?? 0), 0),
    }));
  }
}
