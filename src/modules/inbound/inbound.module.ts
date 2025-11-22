import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ConfigModule } from '../config/config.module';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';

@Module({
  imports: [PrismaModule, InventoryModule, ConfigModule],
  controllers: [InboundController],
  providers: [InboundService],
})
export class InboundModule {}
