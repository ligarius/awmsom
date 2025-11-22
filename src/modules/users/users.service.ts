import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new BadRequestException('Tenant is inactive');
    }

    const existing = await prisma.user.findFirst({ where: { tenantId: dto.tenantId, email: dto.email } });
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    return prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: dto.password,
        tenantId: dto.tenantId,
        roleId: dto.roleId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findByEmail(email: string, tenantId: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findFirst({ where: { tenantId, email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
