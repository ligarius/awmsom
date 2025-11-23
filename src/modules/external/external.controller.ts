import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../auth/api-key.guard';
import { RateLimitGuard } from '../../guards/rate-limit.guard';
import { TenantContextService } from '../../common/tenant-context.service';
import { InboundService } from '../inbound/inbound.service';
import { OutboundService } from '../outbound/outbound.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';

@Controller('ext')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class ExternalController {
  constructor(
    private readonly inboundService: InboundService,
    private readonly outboundService: OutboundService,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async audit(path: string, method: string) {
    const tenantId = this.tenantContext.getTenantId();
    await this.auditService.recordLog({
      tenantId,
      userId: undefined,
      resource: 'EXT_API',
      action: 'CALL',
      metadata: { path, method },
    });
  }

  @Post('inbound/receipts')
  async createInbound(@Body() body: any) {
    await this.audit('/ext/inbound/receipts', 'POST');
    return this.inboundService.createReceipt(body);
  }

  @Post('outbound/orders')
  async createOutbound(@Body() body: any) {
    await this.audit('/ext/outbound/orders', 'POST');
    return this.outboundService.createOutboundOrder(body);
  }

  @Get('inventory')
  async listInventory() {
    await this.audit('/ext/inventory', 'GET');
    return this.inventoryService.listInventorySummary();
  }

  @Get('shipments')
  async listShipments() {
    await this.audit('/ext/shipments', 'GET');
    const tenantId = this.tenantContext.getTenantId();
    return this.outboundService.listShipments({ tenantId } as any);
  }
}
