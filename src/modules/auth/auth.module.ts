import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { AuthUserGuard } from './guards/auth-user.guard';

@Module({
  imports: [PrismaModule, RbacModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthUserGuard],
  exports: [AuthService],
})
export class AuthModule {}
