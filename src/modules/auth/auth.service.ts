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
  ) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT secret is not configured');
    }

    if (Buffer.byteLength(secret, 'utf8') < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    this.jwtSecret = secret;
  }

  private readonly jwtSecret: string;

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isActive: user.isActive,
      fullName: user.fullName ?? user.email,
    };
  }

  private generateMfaCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  private generateTotpCode(secret: string, timestamp = Date.now()) {
    const decodedSecret = this.fromBase32(secret);
    const timeStep = Math.floor(timestamp / 30000);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep));

    const digest = crypto.createHmac('sha1', decodedSecret).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0xf;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const code = (binary % 1000000).toString().padStart(6, '0');
    return code;
  }

  private toBase32(buffer: Buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private fromBase32(secret: string) {
    const sanitized = secret.replace(/=+$/g, '').toUpperCase();
    if (!/^[A-Z2-7]+$/.test(sanitized)) {
      throw new UnauthorizedException('Invalid TOTP secret format');
    }
    if (sanitized.length < 32) {
      throw new UnauthorizedException('TOTP secret too short');
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of sanitized) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) {
        throw new UnauthorizedException('Invalid TOTP secret format');
      }

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  private getTotpEncryptionKey() {
    const key = process.env.TOTP_ENCRYPTION_KEY;

    if (!key) {
      throw new UnauthorizedException('TOTP encryption key is not configured');
    }

    if (Buffer.byteLength(key, 'utf8') < 32) {
      throw new UnauthorizedException('TOTP encryption key is too weak');
    }

    return crypto.createHash('sha256').update(key).digest();
  }

  private encryptTotpSecret(secret: string) {
    const key = this.getTotpEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), encrypted.toString('base64'), authTag.toString('base64')].join('.');
  }

  private decryptTotpSecret(secret: string) {
    const [ivB64, encryptedB64, authTagB64] = secret.split('.');
    if (!ivB64 || !encryptedB64 || !authTagB64) {
      throw new UnauthorizedException('MFA secret not configured');
    }

    const key = this.getTotpEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private generateTotpSecret() {
    const random = crypto.randomBytes(20);
    return this.toBase32(random);
  }

  private buildOtpAuthUri(secret: string, user: any, tenant: any, label?: string) {
    const account = encodeURIComponent(user.email ?? user.id ?? 'user');
    const issuer = encodeURIComponent(tenant?.name ?? 'awmsom');
    const accountLabel = encodeURIComponent(label ?? 'totp');
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30&label=${accountLabel}`;
  }

  private validateMfaCode(code: string, factor: any, challenge: any) {
    if (!factor?.secret) {
      throw new UnauthorizedException('MFA secret not configured');
    }

    if (factor.type === 'totp') {
      const base32Secret = this.decryptTotpSecret(factor.secret);
      const expectedCodes = [
        this.generateTotpCode(base32Secret),
        this.generateTotpCode(base32Secret, Date.now() - 30000),
        this.generateTotpCode(base32Secret, Date.now() + 30000),
      ];

      return expectedCodes.includes(code);
    }

    if (!challenge?.code) {
      return false;
    }

    return code === challenge.code;
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
    const roleAssignments = prisma.userRole?.findMany
      ? await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } })
      : [];
    const permissions = await this.rbacService.getUserPermissions(user.tenantId, user.id);

    const roles = roleAssignments.map((assignment: any) => assignment.role?.name ?? assignment.roleId);
    const permissionList = permissions.map((permission: any) =>
      typeof permission === 'string' ? permission : `${permission.resource}:${permission.action}`,
    );

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      roles,
      permissions: permissionList,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
    return {
      accessToken: token,
      refreshToken: undefined,
      user: {
        ...this.sanitizeUser(user),
        role: roles[0],
        roles,
        permissions: permissionList,
      },
    };
  }

  async getAuthenticatedUser(authorization?: string, cachedUser?: any) {
    if (cachedUser) {
      return cachedUser;
    }

    if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.substring('bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: any;
    try {
      payload = jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!payload?.sub || !payload?.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    const roleAssignments = prisma.userRole?.findMany
      ? await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } })
      : [];
    const permissions = await this.rbacService.getUserPermissions(user.tenantId, user.id);

    const roles = roleAssignments.map((assignment: any) => assignment.role?.name ?? assignment.roleId);
    const permissionList = permissions.map((permission: any) =>
      typeof permission === 'string' ? permission : `${permission.resource}:${permission.action}`,
    );

    const tenant = prisma.tenant?.findUnique
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? user.email,
      tenant: tenant?.name ?? tenant?.code,
      tenantId: user.tenantId,
      role: roles[0],
      roles,
      permissions: permissionList,
    };
  }

  private async upsertChallenge(user: any, factor: any) {
    const prisma = this.prisma as any;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const code =
      factor.type === 'totp'
        ? this.generateTotpCode(this.decryptTotpSecret(factor.secret))
        : this.generateMfaCode();

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

    if (dto.type === 'totp') {
      this.getTotpEncryptionKey();
    }

    const secret = dto.type === 'totp' ? this.generateTotpSecret() : this.generateMfaCode();
    const factor = await prisma.mfaFactor.create({
      data: {
        userId: user.id,
        tenantId: dto.tenantId,
        type: dto.type,
        label: dto.label ?? dto.type,
        destination: dto.destination,
        enabled: dto.enabled ?? true,
        secret: dto.type === 'totp' ? this.encryptTotpSecret(secret) : secret,
      },
    });

    if (dto.type === 'totp') {
      return { factorId: factor.id, otpauthUrl: this.buildOtpAuthUri(secret, user, tenant, dto.label) };
    }

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

    const isValid = this.validateMfaCode(dto.code, factor, challenge);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await prisma.mfaChallenge.update({
      where: { id: dto.challengeId },
      data: { consumedAt: new Date(), code: null },
    });

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.issueToken(user);
  }

  private normalizeProviderKey(provider: string) {
    return provider
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/__+/g, '_');
  }

  private getProviderConfig(provider: string) {
    const key = this.normalizeProviderKey(provider);
    const secret = process.env[`OAUTH_${key}_SECRET`];
    const audience = process.env[`OAUTH_${key}_AUDIENCE`];

    if (!secret) {
      console.warn(`OAuth provider ${provider} is not configured with a verification secret`);
      throw new UnauthorizedException('OAuth provider misconfigured');
    }

    return { secret, audience };
  }

  private verifyProviderToken(provider: string, tokens: { idToken?: string; accessToken?: string }, expectedSub: string) {
    const token = tokens.idToken ?? tokens.accessToken;

    if (!token) {
      console.warn(`OAuth login attempt missing token for provider ${provider}`);
      throw new UnauthorizedException('OAuth token is required');
    }

    const config = this.getProviderConfig(provider);

    try {
      const payload = jwt.verify(token, config.secret, config.audience ? { audience: config.audience } : undefined) as any;

      if (config.audience && payload.aud !== config.audience) {
        throw new Error('Invalid audience');
      }

      if (payload.sub && payload.sub !== expectedSub) {
        throw new Error('Token subject mismatch');
      }

      return payload;
    } catch (error: any) {
      console.warn(`Failed OAuth token verification for provider ${provider}:`, error?.message ?? error);
      throw new UnauthorizedException('Invalid OAuth token');
    }
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

    const tokenPayload = this.verifyProviderToken(
      dto.provider,
      { idToken: dto.idToken, accessToken: dto.accessToken },
      dto.providerUserId,
    );

    const providerUserId = tokenPayload?.sub ?? dto.providerUserId;
    if (!providerUserId) {
      throw new UnauthorizedException('Provider user identifier missing');
    }

    const existingIdentity = await prisma.oauthIdentity.findFirst({
      where: { tenantId: dto.tenantId, provider: dto.provider, providerUserId },
    });

    let user = existingIdentity ? await prisma.user.findUnique({ where: { id: existingIdentity.userId } }) : null;

    if (!user) {
      const email = tokenPayload?.email ?? dto.email ?? `${providerUserId}@${dto.provider}.example.com`;
      const password = crypto.randomBytes(12).toString('hex');
      user = await this.userAccountService.createUser({ tenantId: dto.tenantId, email, password, isActive: true });

      await prisma.oauthIdentity.create({
        data: {
          provider: dto.provider,
          providerUserId,
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
