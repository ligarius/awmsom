import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService, private readonly tenantContext: TenantContextService) {}

  @Post()
  create(@Body() dto: CreateApiKeyDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (this.tenantContext as any)?.request?.user?.id ?? null;
    return this.apiKeysService.createApiKey(tenantId, userId, dto);
  }

  @Get()
  list() {
    const tenantId = this.tenantContext.getTenantId();
    return this.apiKeysService.listApiKeys(tenantId);
  }

  @Delete(':id')
  revoke(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.apiKeysService.revokeApiKey(tenantId, id);
  }
}
