import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService, private readonly tenantContext: TenantContextService) {}

  @Post('subscriptions')
  create(@Body() dto: CreateWebhookSubscriptionDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.webhooksService.createSubscription(tenantId, dto);
  }

  @Get('subscriptions')
  list(@Query('eventType') eventType?: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.webhooksService.listSubscriptions(tenantId, eventType);
  }

  @Get('subscriptions/:id')
  async get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const subs = await this.webhooksService.listSubscriptions(tenantId, undefined);
    return subs.find((s: { id: string }) => s.id === id);
  }

  @Patch('subscriptions/:id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookSubscriptionDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.webhooksService.updateSubscription(tenantId, id, dto);
  }

  @Delete('subscriptions/:id')
  delete(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.webhooksService.deleteSubscription(tenantId, id);
  }
}
