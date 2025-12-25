import { Controller, Get, Param, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { TraceabilityService } from './traceability.service';
import { BatchTraceQueryDto } from './dto/batch-trace-query.dto';
import { CustomerTraceQueryDto } from './dto/customer-trace-query.dto';
import { ProductHistoryQueryDto } from './dto/product-history-query.dto';

@Controller('traceability')
export class TraceabilityController {
  constructor(
    private readonly traceabilityService: TraceabilityService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private async auditLog(resource: string, filters: any) {
    const tenantId = this.tenantContext.getTenantId();
    await this.audit.recordLog({
      tenantId,
      resource,
      action: 'QUERY',
      metadata: { filters },
    });
  }

  @Get('batch')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getBatchTrace(@Query() query: BatchTraceQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', query);
    return this.traceabilityService.getBatchTrace(tenantId, query);
  }

  @Get('batch/:batch')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getBatchOverview(@Param('batch') batch: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', { batch });
    return this.traceabilityService.getBatchOverview(tenantId, batch);
  }

  @Get('customer-shipments')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getCustomerShipments(@Query() query: CustomerTraceQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', query);
    return this.traceabilityService.getCustomerShipmentsTrace(tenantId, query);
  }

  @Get('customer/:id')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getCustomerTrace(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', { customer: id });
    return this.traceabilityService.getCustomerTrace(tenantId, id);
  }

  @Get('product-history')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getProductHistory(@Query() query: ProductHistoryQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', query);
    return this.traceabilityService.getProductHistory(tenantId, query);
  }

  @Get('product/:sku')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getProductTrace(@Param('sku') sku: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', { sku });
    return this.traceabilityService.getProductTrace(tenantId, sku);
  }

  @Get('order/:id')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getOrderTrace(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', { order: id });
    return this.traceabilityService.getOrderTrace(tenantId, id);
  }

  @Get('movement/:id')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getMovementTrace(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditLog('TRACEABILITY', { movement: id });
    return this.traceabilityService.getMovementTrace(tenantId, id);
  }
}
