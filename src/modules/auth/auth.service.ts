import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  health() {
    return { status: 'ok', module: 'auth' };
  }

  async login(dto: LoginDto) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const user = await prisma.user.findFirst({ where: { tenantId: dto.tenantId, email: dto.email } });

    if (!user || user.passwordHash !== dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      roles: user.roleId ? [user.roleId] : [],
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return { access_token: token, payload };
  }
}
