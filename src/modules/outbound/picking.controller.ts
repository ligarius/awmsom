import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource, PickingTaskStatus } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';

@Controller('picking')
export class PickingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('tasks')
  @Permissions(PermissionResource.PICKING, PermissionAction.READ)
  async list(@Query('page') page = '1', @Query('limit') limit = '20') {
    const tenantId = this.tenantContext.getTenantId();
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.pickingTask.count({ where: { tenantId } }),
      this.prisma.pickingTask.findMany({
        where: { tenantId },
        include: {
          lines: {
            include: {
              product: true,
              fromLocation: true,
              batch: true,
            },
          },
          outboundOrder: true,
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

  @Get('tasks/:id')
  @Permissions(PermissionResource.PICKING, PermissionAction.READ)
  async get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.pickingTask.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            product: true,
            fromLocation: true,
            batch: true,
          },
        },
        outboundOrder: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Picking task not found');
    }

    return this.mapTask(task);
  }

  private mapTask(task: any) {
    const line = task.lines[0];
    return {
      id: task.id,
      code: `PICK-${task.id.slice(0, 8).toUpperCase()}`,
      productId: line?.productId ?? '',
      productSku: line?.product?.sku ?? line?.productId ?? '',
      productName: line?.product?.name,
      quantity: Number(line?.quantityToPick ?? 0),
      uom: line?.uom,
      locationId: line?.fromLocationId ?? undefined,
      locationCode: line?.fromLocation?.code ?? undefined,
      status: this.mapStatus(task.status),
      waveId: task.waveId ?? undefined,
      orderCode: task.outboundOrder?.externalRef ?? task.outboundOrderId ?? undefined,
      batch: line?.batch?.batchCode ?? line?.batch?.code ?? null,
    };
  }

  private mapStatus(status: PickingTaskStatus) {
    switch (status) {
      case PickingTaskStatus.IN_PROGRESS:
        return 'IN_PROGRESS';
      case PickingTaskStatus.COMPLETED:
        return 'DONE';
      default:
        return 'PENDING';
    }
  }
}
