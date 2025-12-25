import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ConfigModule } from '../config/config.module';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';
import { PaginationService } from '../../common/pagination/pagination.service';

@Module({
  imports: [PrismaModule, InventoryModule, ConfigModule],
  controllers: [InboundController],
  providers: [InboundService, PaginationService],
  exports: [InboundService],
})
export class InboundModule {}
