import { BadRequestException, Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto';
import { UpsertPickingMethodConfigDto } from './dto/upsert-picking-method-config.dto';
import { UpsertWarehouseZoneConfigDto } from './dto/upsert-warehouse-zone-config.dto';
import { UpsertInventoryPolicyDto } from './dto/upsert-inventory-policy.dto';
import { UpsertOutboundRuleDto } from './dto/upsert-outbound-rule.dto';
import { UpsertMovementReasonDto } from './dto/upsert-movement-reason.dto';

@Controller('config')
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('tenant')
  getTenantConfig() {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.getTenantConfig(tenantId);
  }

  @Put('tenant')
  updateTenantConfig(@Body() dto: UpdateTenantConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.updateTenantConfig(tenantId, dto);
  }

  @Get('picking-methods')
  getPickingMethods(@Query('warehouseId') warehouseId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.getPickingMethods(tenantId, warehouseId);
  }

  @Put('picking-methods')
  upsertPickingMethod(@Body() dto: UpsertPickingMethodConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.upsertPickingMethod(tenantId, dto);
  }

  @Get('movement-reasons')
  getMovementReasons() {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.getMovementReasons(tenantId);
  }

  @Put('movement-reasons')
  upsertMovementReason(@Body() dto: UpsertMovementReasonDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.upsertMovementReason(tenantId, dto);
  }

  @Get('zones')
  getZones(@Query('warehouseId') warehouseId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    return this.configService.getWarehouseZones(tenantId, warehouseId);
  }

  @Put('zones')
  upsertZone(@Body() dto: UpsertWarehouseZoneConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.upsertWarehouseZone(tenantId, dto);
  }

  @Get('inventory-policies')
  getInventoryPolicies(
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.getInventoryPolicies(tenantId, warehouseId, productId);
  }

  @Put('inventory-policies')
  upsertInventoryPolicy(@Body() dto: UpsertInventoryPolicyDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.upsertInventoryPolicy(tenantId, dto);
  }

  @Get('outbound-rules')
  getOutboundRule(@Query('warehouseId') warehouseId?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.getOutboundRule(tenantId, warehouseId);
  }

  @Put('outbound-rules')
  upsertOutboundRule(@Body() dto: UpsertOutboundRuleDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.configService.upsertOutboundRule(tenantId, dto);
  }
}
