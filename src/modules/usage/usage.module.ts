import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsageController } from './usage.controller';
import { UsageGuard } from './usage.guard';
import { UsageService } from './usage.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsageController],
  providers: [UsageService, UsageGuard],
  exports: [UsageService, UsageGuard],
})
export class UsageModule {}
