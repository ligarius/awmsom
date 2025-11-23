import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationsService } from './integrations.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService, private readonly tenantContext: TenantContextService) {}

  @Post()
  create(@Body() dto: CreateIntegrationConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.integrationsService.createIntegrationConfig(tenantId, dto);
  }

  @Get()
  list(@Query('type') type?: any) {
    const tenantId = this.tenantContext.getTenantId();
    return this.integrationsService.listIntegrations(tenantId, type);
  }

  @Get('jobs')
  listJobs(@Query() query: PaginationDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.integrationsService.listIntegrationJobs(tenantId, query.page, query.limit);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.integrationsService.getIntegration(tenantId, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIntegrationConfigDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.integrationsService.updateIntegrationConfig(tenantId, id, dto);
  }
}
