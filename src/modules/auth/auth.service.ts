import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService = {
      getUserPermissions: async () => [],
    } as unknown as RbacService,
  ) {}

  private readonly jwtSecret = process.env.JWT_SECRET || 'defaultSecret';

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isActive: user.isActive,
    };
  }

  health() {
    return { status: 'ok', module: 'auth' };
  }

  async login(dto: LoginDto) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const user = await prisma.user.findFirst({ where: { tenantId: dto.tenantId, email: dto.email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userRoles = prisma.userRole?.findMany
      ? await prisma.userRole.findMany({ where: { userId: user.id }, select: { roleId: true } })
      : [];
    const permissions = await this.rbacService.getUserPermissions(user.tenantId, user.id);

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      roles: userRoles.map((r: any) => r.roleId),
      permissions,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
    return { access_token: token, payload };
  }

  async register(dto: RegisterDto) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const existing = await prisma.user.findFirst({ where: { tenantId: dto.tenantId, email: dto.email } });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        tenantId: dto.tenantId,
        isActive: dto.isActive ?? true,
      },
    });

    return this.sanitizeUser(user);
  }

  async listUsers(tenantId: string) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const users = await prisma.user.findMany({ where: { tenantId } });
    return users.map((user: any) => this.sanitizeUser(user));
  }

  async findUser(tenantId: string, email: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findFirst({ where: { tenantId, email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async updateCredentials(id: string, dto: UpdateCredentialsDto) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const data: any = { isActive: dto.isActive ?? user.isActive };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await prisma.user.update({ where: { id }, data });
    return this.sanitizeUser(updated);
  }

  async deactivateUser(id: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }
    if (!user.isActive) {
      throw new ConflictException('User already inactive');
    }

    const updated = await prisma.user.update({ where: { id }, data: { isActive: false } });
    return this.sanitizeUser(updated);
  }

  async deleteUser(id: string) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }
    if (!user.isActive) {
      throw new ConflictException('User inactive');
    }

    const deleted = await prisma.user.delete({ where: { id } });
    return this.sanitizeUser(deleted);
  }
}
