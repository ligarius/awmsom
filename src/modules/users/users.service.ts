import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(tenantIdOrDto: string | CreateUserDto, dtoMaybe?: CreateUserDto) {
    const dto = (typeof tenantIdOrDto === 'string' ? dtoMaybe : tenantIdOrDto) as CreateUserDto | undefined;
    const tenantId = typeof tenantIdOrDto === 'string' ? tenantIdOrDto : tenantIdOrDto?.tenantId;

    if (!dto) {
      throw new BadRequestException('User payload is required');
    }
    if (!tenantId) {
      throw new BadRequestException('Tenant is required');
    }

    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new BadRequestException('Tenant is inactive');
    }

    const existing = await prisma.user.findFirst({ where: { tenantId, email: dto.email } });
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    return prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: dto.password,
        tenantId,
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
