import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UserAccountService } from './user-account.service';
import { UsersService } from './users.service';
import { RbacModule } from '../rbac/rbac.module';
import { TenantContextService } from '../../common/tenant-context.service';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [UsersController],
  providers: [UsersService, UserAccountService, TenantContextService],
  exports: [UsersService, UserAccountService],
})
export class UsersModule {}
