import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsageService, UsageMetricKey } from './usage.service';

@Controller('admin/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get(':tenantId')
  getUsage(@Param('tenantId') tenantId: string) {
    return this.usageService.getUsageSnapshot(tenantId);
  }

  @Post(':tenantId/check')
  check(@Param('tenantId') tenantId: string, @Body() body: { metric: UsageMetricKey; increment?: number }) {
    return this.usageService.checkLimit(tenantId, body.metric, body.increment ?? 1);
  }
}
