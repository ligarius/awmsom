import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', module: 'users' };
  }

  @Post()
  @Permissions(PermissionResource.USERS, PermissionAction.CREATE)
  create(@Body() dto: CreateUserDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.createUserWithRole(tenantId, dto);
  }

  @Get()
  @Permissions(PermissionResource.USERS, PermissionAction.READ)
  list() {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.listUsers(tenantId);
  }

  @Get(':id')
  @Permissions(PermissionResource.USERS, PermissionAction.READ)
  get(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.getUser(tenantId, id);
  }

  @Patch(':id')
  @Permissions(PermissionResource.USERS, PermissionAction.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.updateUser(tenantId, id, dto);
  }

  @Post(':id/activate')
  @Permissions(PermissionResource.USERS, PermissionAction.UPDATE)
  activate(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.setUserActive(tenantId, id, true);
  }

  @Post(':id/deactivate')
  @Permissions(PermissionResource.USERS, PermissionAction.UPDATE)
  deactivate(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.usersService.setUserActive(tenantId, id, false);
  }
}
