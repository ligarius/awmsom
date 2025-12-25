import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { TenantContextService } from '../../common/tenant-context.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [TenantContextService],
})
export class ReportsModule {}
