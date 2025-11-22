import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { BlockLotUseCase } from './application/use-cases/block-lot.use-case';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case';
import { SelectFefoLotUseCase } from './application/use-cases/select-fefo-lot.use-case';
import { RegisterInventoryMovementUseCase } from './application/use-cases/register-inventory-movement.use-case';
import { INVENTORY_REPOSITORY } from './domain/repositories/inventory.repository';
import { LOT_REPOSITORY } from './domain/repositories/lot.repository';
import { INVENTORY_MOVEMENT_REPOSITORY } from './domain/repositories/inventory-movement.repository';
import { PrismaInventoryRepository } from './infrastructure/persistence/prisma-inventory.repository';
import { PrismaLotRepository } from './infrastructure/persistence/prisma-lot.repository';
import { PrismaInventoryMovementRepository } from './infrastructure/persistence/prisma-inventory-movement.repository';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    BlockLotUseCase,
    AdjustStockUseCase,
    SelectFefoLotUseCase,
    RegisterInventoryMovementUseCase,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
    { provide: LOT_REPOSITORY, useClass: PrismaLotRepository },
    { provide: INVENTORY_MOVEMENT_REPOSITORY, useClass: PrismaInventoryMovementRepository },
  ],
  exports: [
    InventoryService,
    BlockLotUseCase,
    AdjustStockUseCase,
    SelectFefoLotUseCase,
    RegisterInventoryMovementUseCase,
    INVENTORY_REPOSITORY,
    LOT_REPOSITORY,
    INVENTORY_MOVEMENT_REPOSITORY,
  ],
})
export class InventoryModule {}
