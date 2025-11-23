import { Module } from '@nestjs/common';
import { OutboundController } from './outbound.controller';
import { OutboundService } from './outbound.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '../config/config.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaginationService } from '../../common/pagination/pagination.service';

@Module({
  imports: [PrismaModule, ConfigModule, InventoryModule],
  controllers: [OutboundController],
  providers: [OutboundService, PaginationService],
  exports: [OutboundService],
})
export class OutboundModule {}
