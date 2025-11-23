import { Body, Controller, Get, Post } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post()
  @Permissions(PermissionResource.USERS, PermissionAction.CREATE)
  create(@Body() dto: CreateUserDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.createUser(tenantId, dto);
  }

  @Get('health')
  health() {
    return { status: 'ok', module: 'users' };
  }
}
