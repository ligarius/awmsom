import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CreateInboundReceiptUseCase } from './application/use-cases/create-inbound-receipt.use-case';
import { RegisterPutawayUseCase } from './application/use-cases/register-putaway.use-case';
import { InboundController } from './controllers/inbound.controller';
import { INBOUND_RECEIPT_REPOSITORY } from './domain/repositories/inbound-receipt.repository';
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository';
import { PUTAWAY_MOVEMENT_REPOSITORY } from './domain/repositories/putaway-movement.repository';
import { PrismaInboundReceiptRepository } from './infrastructure/persistence/prisma/prisma-inbound-receipt.repository';
import { PrismaProductRepository } from './infrastructure/persistence/prisma/prisma-product.repository';
import { PrismaPutawayMovementRepository } from './infrastructure/persistence/prisma/prisma-putaway-movement.repository';

@Module({
  imports: [PrismaModule],
  controllers: [InboundController],
  providers: [
    CreateInboundReceiptUseCase,
    RegisterPutawayUseCase,
    { provide: INBOUND_RECEIPT_REPOSITORY, useClass: PrismaInboundReceiptRepository },
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: PUTAWAY_MOVEMENT_REPOSITORY, useClass: PrismaPutawayMovementRepository },
  ],
})
export class InboundModule {}
