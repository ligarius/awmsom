import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuditModule } from '../audit/audit.module';
import { InboundModule } from '../inbound/inbound.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OutboundModule } from '../outbound/outbound.module';
import { ExternalController } from './external.controller';
import { RateLimitService } from '../../common/rate-limit.service';
import { RateLimitGuard } from '../../guards/rate-limit.guard';
import { ApiKeyGuard } from '../../auth/api-key.guard';

@Module({
  imports: [ApiKeysModule, AuditModule, InboundModule, OutboundModule, InventoryModule],
  controllers: [ExternalController],
  providers: [RateLimitService, RateLimitGuard, ApiKeyGuard],
})
export class ExternalModule {}
