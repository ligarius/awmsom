import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

export type CreateUserPayload = {
  email: string;
  password: string;
  tenantId: string;
  isActive?: boolean;
};

@Injectable()
export class UserAccountService {
  private readonly bcryptSaltRounds = 10;

  constructor(private readonly prisma: PrismaService) {}

  private ensurePasswordPresent(password?: string) {
    if (!password || password.trim().length === 0) {
      throw new BadRequestException('Password is required');
    }
  }

  private async validateActiveTenant(tenantId: string) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    return tenant;
  }

  private async ensureEmailAvailable(tenantId: string, email: string) {
    const prisma = this.prisma as any;
    const existing = await prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) {
      throw new ConflictException('User already exists');
    }
  }

  async createUser(dto: CreateUserPayload) {
    this.ensurePasswordPresent(dto.password);
    await this.validateActiveTenant(dto.tenantId);
    await this.ensureEmailAvailable(dto.tenantId, dto.email);

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);
    const prisma = this.prisma as any;

    return prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        tenantId: dto.tenantId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async hashPassword(password: string) {
    this.ensurePasswordPresent(password);
    return bcrypt.hash(password, this.bcryptSaltRounds);
  }
}
