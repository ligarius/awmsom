import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource, TransferOrderStatus } from '@prisma/client';
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
  @Permissions(PermissionResource.TENANT_CONFIG, PermissionAction.CONFIG)
  createPolicy(@Body() dto: CreateReplenishmentPolicyDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.createPolicy(tenantId, dto);
  }

  @Patch('policies/:id')
  @Permissions(PermissionResource.TENANT_CONFIG, PermissionAction.CONFIG)
  updatePolicy(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateReplenishmentPolicyDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.updatePolicy(tenantId, id, dto);
  }

  @Get('policies')
  @Permissions(PermissionResource.TENANT_CONFIG, PermissionAction.CONFIG)
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

  @Get('suggestions')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.READ)
  listSuggestions(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.listSuggestions(tenantId, Number(page), Number(pageSize));
  }

  @Get('history')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.READ)
  listHistory() {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.listHistory(tenantId);
  }

  @Get(':id/approve')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  approveLegacy(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const dto: ApproveSuggestionDto = { suggestionId: id, approve: true };
    return this.service.approveSuggestion(tenantId, dto);
  }

  @Get(':id/execute')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  executeLegacy(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.executeSuggestion(tenantId, id);
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

  @Post('transfer-orders/:id/approve')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  approveTransferOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.updateTransferOrderStatus(tenantId, id, TransferOrderStatus.APPROVED);
  }

  @Post('transfer-orders/:id/execute')
  @Permissions(PermissionResource.INVENTORY, PermissionAction.UPDATE)
  executeTransferOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.service.updateTransferOrderStatus(tenantId, id, TransferOrderStatus.COMPLETED);
  }
}
