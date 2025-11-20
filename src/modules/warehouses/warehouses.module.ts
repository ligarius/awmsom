import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehousesController } from './warehouses.controller';
import { WarehouseApplicationService } from './application/services/warehouse.application-service';
import { PrismaWarehouseRepository } from './infrastructure/persistence/prisma-warehouse.repository';

@Module({
  imports: [PrismaModule],
  controllers: [WarehousesController],
  providers: [
    PrismaWarehouseRepository,
    {
      provide: 'WarehouseRepository',
      useExisting: PrismaWarehouseRepository,
    },
    WarehouseApplicationService,
  ],
})
export class WarehousesModule {}
