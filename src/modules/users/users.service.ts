import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserPayload, UserAccountService } from './user-account.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userAccountService: UserAccountService,
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

    return this.userAccountService.createUser(payload);
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
