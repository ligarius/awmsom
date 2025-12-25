import { Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { PermissionAction, PermissionResource, PickingTaskStatus } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { OutboundService } from './outbound.service';
import { CompletePickingDto } from './dto/complete-picking.dto';
import { TenantContextService } from '../../common/tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('picking-tasks')
export class PickingTasksController {
  constructor(
    private readonly outboundService: OutboundService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':id/complete')
  @Permissions(PermissionResource.PICKING, PermissionAction.UPDATE)
  async complete(@Param('id') id: string, @Body() dto: CompletePickingDto) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.pickingTask.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!task) {
      throw new NotFoundException('Picking task not found');
    }

    const startableStatuses: PickingTaskStatus[] = [
      PickingTaskStatus.CREATED,
      PickingTaskStatus.ASSIGNED,
    ];
    if (startableStatuses.includes(task.status)) {
      await this.outboundService.startPickingTask(id);
    }

    const line = task.lines[0];
    if (!line) {
      throw new NotFoundException('Picking task line not found');
    }

    const quantity = Number(dto.quantity ?? 0);
    const payload = {
      lines: [
        {
          pickingTaskLineId: line.id,
          quantityPicked: quantity > 0 ? quantity : Number(line.quantityToPick ?? 0),
        },
      ],
    };

    return this.outboundService.confirmPickingTask(id, payload);
  }
}
