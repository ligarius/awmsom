import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { SlottingService } from './slotting.service';
import { CreateSlottingConfigDto } from './dto/create-slotting-config.dto';
import { UpdateSlottingConfigDto } from './dto/update-slotting-config.dto';
import { CalculateSlottingDto } from './dto/calculate-slotting.dto';
import { ApproveSlottingDto } from './dto/approve-slotting.dto';

@Controller('slotting')
export class SlottingController {
  constructor(private readonly service: SlottingService, private readonly tenantContext: TenantContextService) {}

  @Post('config')
  @Permissions(PermissionResource.CONFIG, PermissionAction.CONFIG)
  createConfig(@Body() dto: CreateSlottingConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.createConfig(tenantId, dto);
  }

  @Patch('config/:id')
  @Permissions(PermissionResource.CONFIG, PermissionAction.CONFIG)
  updateConfig(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSlottingConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.updateConfig(tenantId, id, dto);
  }

  @Get('config')
  @Permissions(PermissionResource.CONFIG, PermissionAction.CONFIG)
  listConfig(@Query('warehouseId') warehouseId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.listConfigs(tenantId, warehouseId);
  }

  @Post('calculate')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  calculate(@Body() dto: CalculateSlottingDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.calculateSlotting(tenantId, dto);
  }

  @Get('recommendations')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.READ)
  recommendations(@Query('warehouseId') warehouseId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.listRecommendations(tenantId, warehouseId);
  }

  @Post('recommendations/:id/approve')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  approve(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: Partial<ApproveSlottingDto> = {}) {
    const tenantId = this.tenantContext.getTenantId();
    const dto: ApproveSlottingDto = { recommendationId: id, approve: body.approve ?? true };
    return this.service.approveRecommendation(tenantId, dto);
  }

  @Post('recommendations/:id/execute')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  execute(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.executeRecommendation(tenantId, id);
  }
}
