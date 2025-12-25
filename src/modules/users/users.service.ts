import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserPayload, UserAccountService } from './user-account.service';
import { RbacService } from '../rbac/rbac.service';
import { ROLE_TENANT_OPERATOR } from '../../common/auth.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userAccountService: UserAccountService,
    private readonly rbacService: RbacService,
  ) {}

  async createUser(tenantIdOrDto: string | CreateUserDto, dtoMaybe?: CreateUserDto) {
    const dto = (typeof tenantIdOrDto === 'string' ? dtoMaybe : tenantIdOrDto) as CreateUserDto | undefined;
    const tenantId = typeof tenantIdOrDto === 'string' ? tenantIdOrDto : tenantIdOrDto?.tenantId;

    if (!dto) {
      throw new BadRequestException('User payload is required');
    }
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }

    const payload: CreateUserPayload = {
      email: dto.email,
      password: dto.password,
      tenantId,
      isActive: dto.isActive,
    };

    const accountService = this.userAccountService ?? new UserAccountService(this.prisma);
    return accountService.createUser(payload);
  }

  async createUserWithRole(tenantId: string, dto: CreateUserDto) {
    const user = await this.createUser(tenantId, dto);
    const roleName = dto.role ?? ROLE_TENANT_OPERATOR;

    const role = await this.prisma.role.findFirst({ where: { tenantId, name: roleName } });
    if (!role) {
      throw new BadRequestException(`Role ${roleName} not found for tenant`);
    }

    await this.rbacService.assignRoleToUser(tenantId, { userId: user.id, roleId: role.id });

    return this.getUser(tenantId, user.id);
  }

  async findByEmail(email: string, tenantId: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findFirst({ where: { tenantId, email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listUsers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapUser(user));
  }

  async getUser(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.rbacService.getUserPermissions(tenantId, user.id);

    return this.mapUser(user, permissions);
  }

  async updateUser(tenantId: string, id: string, dto: UpdateUserDto) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};
    if (dto.password) {
      const accountService = this.userAccountService ?? new UserAccountService(this.prisma);
      data.passwordHash = await accountService.hashPassword(dto.password);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length) {
      await prisma.user.update({ where: { id }, data });
    }

    if (dto.role) {
      const role = await prisma.role.findFirst({ where: { tenantId, name: dto.role } });
      if (!role) {
        throw new BadRequestException(`Role ${dto.role} not found for tenant`);
      }
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.create({ data: { userId: id, roleId: role.id } });
    }

    return this.getUser(tenantId, id);
  }

  async setUserActive(tenantId: string, id: string, isActive: boolean) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await prisma.user.update({ where: { id }, data: { isActive } });
    return this.getUser(tenantId, id);
  }

  private mapUser(user: any, permissions?: { resource: string; action: string }[]) {
    const primaryRole = user.userRoles?.[0]?.role?.name ?? 'UNASSIGNED';
    const permissionList = permissions?.map((permission) => `${permission.resource}:${permission.action}`);
    return {
      id: user.id,
      fullName: user.fullName ?? user.email,
      email: user.email,
      role: primaryRole,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: user.createdAt,
      lastLogin: undefined,
      permissions: permissionList,
    };
  }
}
