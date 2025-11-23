import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserAccountService } from '../users/user-account.service';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import { MfaEnrollDto } from './dto/mfa-enroll.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService = {
      getUserPermissions: async () => [],
    } as unknown as RbacService,
    private readonly userAccountService: UserAccountService = new UserAccountService(prisma as any),
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

  private generateMfaCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  private generateTotpCode(secret: string, timestamp = Date.now()) {
    const timeStep = Math.floor(timestamp / 30000);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep));

    const digest = crypto.createHmac('sha1', secret).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0xf;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const code = (binary % 1000000).toString().padStart(6, '0');
    return code;
  }

  private validateMfaCode(code: string, factor: any) {
    if (!factor?.secret) {
      throw new UnauthorizedException('MFA secret not configured');
    }

    if (factor.type === 'totp') {
      const window = 1;
      for (let i = -window; i <= window; i++) {
        const timestamp = Date.now() + i * 30000;
        if (this.generateTotpCode(factor.secret, timestamp) === code) {
          return true;
        }
      }
      return false;
    }

    return code === factor.secret;
  }

  private deliverMfaCode(factor: any, code: string) {
    const destination = factor.destination ?? factor.label ?? factor.type;
    const transport = factor.type?.toLowerCase();

    if (transport === 'sms' || transport === 'email') {
      console.info(`Sending ${transport.toUpperCase()} MFA code to ${destination}`);
    } else if (transport === 'totp') {
      console.info(`Generate TOTP code for ${destination}`);
    } else {
      console.info(`Delivering MFA code via ${transport ?? 'unknown'} to ${destination}`);
    }

    // In a real implementation, integrate with email/SMS/TOTP delivery providers here.
    return code;
  }

  private async issueToken(user: any) {
    const prisma = this.prisma as any;
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

  private async upsertChallenge(user: any, factor: any) {
    const prisma = this.prisma as any;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const code = factor.type === 'totp' ? this.generateTotpCode(factor.secret) : factor.secret;

    const challenge = await prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        factorId: factor.id,
        code,
        expiresAt,
        channelHint: factor.destination ?? factor.label ?? factor.type,
      },
    });

    this.deliverMfaCode(factor, code);

    return { challenge };
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

    const factors = (await prisma.mfaFactor?.findMany({ where: { userId: user.id, enabled: true } })) ?? [];
    if (factors.length > 0) {
      if (dto.mfaCode && dto.challengeId) {
        return this.verifyMfa({ challengeId: dto.challengeId, code: dto.mfaCode });
      }

      const factor = dto.factorId ? factors.find((f: any) => f.id === dto.factorId) ?? factors[0] : factors[0];
      const { challenge } = await this.upsertChallenge(user, factor);

      return {
        mfaRequired: true,
        challengeId: challenge.id,
        factor: { id: factor.id, type: factor.type, channelHint: challenge.channelHint },
      };
    }

    return this.issueToken(user);
  }

  async register(dto: RegisterDto) {
    const user = await this.userAccountService.createUser(dto);

    return this.sanitizeUser(user);
  }

  async enrollFactor(dto: MfaEnrollDto) {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.tenantId !== dto.tenantId) {
      throw new ForbiddenException('Cross-tenant enrollment is not allowed');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const factor = await prisma.mfaFactor.create({
      data: {
        userId: user.id,
        tenantId: dto.tenantId,
        type: dto.type,
        label: dto.label ?? dto.type,
        destination: dto.destination,
        enabled: dto.enabled ?? true,
        secret: this.generateMfaCode(),
      },
    });

    return factor;
  }

  async verifyMfa(dto: VerifyMfaDto) {
    const prisma = this.prisma as any;
    const challenge = await prisma.mfaChallenge.findUnique({ where: { id: dto.challengeId } });
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    if (challenge.consumedAt) {
      throw new ConflictException('Challenge already used');
    }

    if (challenge.expiresAt && new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Challenge expired');
    }

    const factor = await prisma.mfaFactor.findUnique({ where: { id: challenge.factorId } });
    if (!factor || factor.userId !== challenge.userId) {
      throw new UnauthorizedException('Invalid MFA factor');
    }

    const isValid = this.validateMfaCode(dto.code, factor);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await prisma.mfaChallenge.update({
      where: { id: dto.challengeId },
      data: { consumedAt: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.issueToken(user);
  }

  async oauthLogin(dto: OAuthLoginDto) {
    const prisma = this.prisma as any;
    const tenant = await prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const existingIdentity = await prisma.oauthIdentity.findFirst({
      where: { tenantId: dto.tenantId, provider: dto.provider, providerUserId: dto.providerUserId },
    });

    let user = existingIdentity ? await prisma.user.findUnique({ where: { id: existingIdentity.userId } }) : null;

    if (!user) {
      const email = dto.email ?? `${dto.providerUserId}@${dto.provider}.example.com`;
      const password = crypto.randomBytes(12).toString('hex');
      user = await this.userAccountService.createUser({ tenantId: dto.tenantId, email, password, isActive: true });

      await prisma.oauthIdentity.create({
        data: {
          provider: dto.provider,
          providerUserId: dto.providerUserId,
          tenantId: dto.tenantId,
          userId: user.id,
          displayName: dto.displayName ?? dto.providerUserId,
          email,
        },
      });
    }

    return this.issueToken(user);
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
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

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
      data.passwordHash = await this.userAccountService.hashPassword(dto.password);
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
