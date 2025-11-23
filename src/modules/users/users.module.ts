import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UserAccountService } from './user-account.service';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UserAccountService],
  exports: [UsersService, UserAccountService],
})
export class UsersModule {}
