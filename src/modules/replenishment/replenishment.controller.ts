import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { ReplenishmentService } from './replenishment.service';
import { CreateReplenishmentPolicyDto } from './dto/create-replenishment-policy.dto';
import { UpdateReplenishmentPolicyDto } from './dto/update-replenishment-policy.dto';
import { EvaluateReplenishmentDto } from './dto/evaluate-replenishment.dto';
import { ApproveSuggestionDto } from './dto/approve-suggestion.dto';
import { CreateTransferOrderDto } from './dto/create-transfer-order.dto';

@Controller('replenishment')
export class ReplenishmentController {
  constructor(private readonly service: ReplenishmentService, private readonly tenantContext: TenantContextService) {}

  @Post('policies')
  @Permissions(PermissionResource.CONFIG, PermissionAction.CONFIG)
  createPolicy(@Body() dto: CreateReplenishmentPolicyDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.createPolicy(tenantId, dto);
  }

  @Patch('policies/:id')
  @Permissions(PermissionResource.CONFIG, PermissionAction.CONFIG)
  updatePolicy(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateReplenishmentPolicyDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.updatePolicy(tenantId, id, dto);
  }

  @Get('policies')
  @Permissions(PermissionResource.CONFIG, PermissionAction.CONFIG)
  listPolicies(@Query('warehouseId') warehouseId?: string, @Query('productId') productId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.listPolicies(tenantId, warehouseId, productId);
  }

  @Post('evaluate')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  evaluate(@Body() dto: EvaluateReplenishmentDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.evaluateReplenishment(tenantId, dto);
  }

  @Post('suggestions/:id/approve')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  approve(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const dto: ApproveSuggestionDto = { suggestionId: id, approve: true };
    return this.service.approveSuggestion(tenantId, dto);
  }

  @Post('suggestions/:id/reject')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  reject(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const dto: ApproveSuggestionDto = { suggestionId: id, approve: false };
    return this.service.approveSuggestion(tenantId, dto);
  }

  @Post('transfer-orders')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  createTransferOrder(@Body() dto: CreateTransferOrderDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.createTransferOrderFromSuggestions(tenantId, dto);
  }

  @Get('transfer-orders')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.READ)
  listTransferOrders() {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.listTransferOrders(tenantId);
  }
}
