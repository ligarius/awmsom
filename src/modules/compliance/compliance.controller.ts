import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ComplianceService } from './compliance.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { UpdateRetentionSettingsDto } from './dto/update-retention-settings.dto';
import { UpdateReviewSettingsDto } from './dto/update-review-settings.dto';
import { ComplianceScopeGuard } from './guards/compliance-scope.guard';

@Controller()
@UseGuards(ComplianceScopeGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('compliance/settings')
  getRetentionSettings() {
    const tenantId = this.tenantContext.getTenantId();
    return this.complianceService.getComplianceSettings(tenantId);
  }

  @Patch('compliance/settings')
  updateRetention(@Body() dto: UpdateRetentionSettingsDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.id;
    return this.complianceService.updateComplianceSettings(tenantId, dto, userId);
  }

  @Get('audit/reviews/settings')
  getReviewSettings() {
    const tenantId = this.tenantContext.getTenantId();
    return this.complianceService.getReviewSettings(tenantId);
  }

  @Patch('audit/reviews/settings')
  updateReviewSettings(@Body() dto: UpdateReviewSettingsDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.id;
    return this.complianceService.updateReviewSettings(tenantId, dto, userId);
  }
}
