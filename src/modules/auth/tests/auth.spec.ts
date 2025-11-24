import { AuthService } from '../auth.service';
import { UserAccountService } from '../../users/user-account.service';
import * as jwt from 'jsonwebtoken';

class MockPrismaService {
  private id = 1;
  tenants: any[] = [];
  users: any[] = [];
  mfaFactors: any[] = [];
  mfaChallenges: any[] = [];
  oauthIdentities: any[] = [];
  userRole = { findMany: () => [] };

  private nextId() {
    return `id-${this.id++}`;
  }

  tenant = {
    create: ({ data }: any) => {
      const record = { id: this.nextId(), isActive: true, ...data };
      this.tenants.push(record);
      return record;
    },
    findUnique: ({ where }: any) => this.tenants.find((t) => t.id === where.id) ?? null,
  };

  oauthIdentity = {
    findFirst: ({ where }: any) =>
      this.oauthIdentities.find(
        (i) =>
          i.tenantId === where.tenantId && i.provider === where.provider && i.providerUserId === where.providerUserId,
      ) ?? null,
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.oauthIdentities.push(record);
      return record;
    },
  };

  user = {
    findFirst: ({ where }: any) => {
      return this.users.find((u) => u.tenantId === where.tenantId && u.email === where.email) ?? null;
    },
    findUnique: ({ where }: any) => {
      if (where.id) {
        return this.users.find((u) => u.id === where.id) ?? null;
      }
      const key = where.tenantId_email;
      return this.users.find((u) => u.tenantId === key.tenantId && u.email === key.email) ?? null;
    },
    findMany: ({ where }: any) => {
      return this.users.filter((u) => u.tenantId === where.tenantId);
    },
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.users.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const user = this.users.find((u) => u.id === where.id);
      if (!user) {
        return null;
      }
      Object.assign(user, data);
      return user;
    },
    delete: ({ where }: any) => {
      const idx = this.users.findIndex((u) => u.id === where.id);
      if (idx === -1) {
        return null;
      }
      const [deleted] = this.users.splice(idx, 1);
      return deleted;
    },
  };

  mfaFactor = {
    findMany: ({ where }: any) => this.mfaFactors.filter((f) => f.userId === where.userId && f.enabled === true),
    findUnique: ({ where }: any) => this.mfaFactors.find((f) => f.id === where.id) ?? null,
    create: ({ data }: any) => {
      const record = { id: this.nextId(), createdAt: new Date(), updatedAt: new Date(), ...data };
      this.mfaFactors.push(record);
      return record;
    },
  };

  mfaChallenge = {
    findUnique: ({ where }: any) => this.mfaChallenges.find((c) => c.id === where.id) ?? null,
    create: ({ data }: any) => {
      const record = { id: this.nextId(), createdAt: new Date(), consumedAt: null, ...data };
      this.mfaChallenges.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const challenge = this.mfaChallenges.find((c) => c.id === where.id);
      if (!challenge) return null;
      Object.assign(challenge, data);
      return challenge;
    },
  };
}

describe('Auth module', () => {
  let prisma: MockPrismaService;
  let authService: AuthService;
  let userAccountService: UserAccountService;
  const providerSecret = 'provider-secret';
  const providerAudience = 'awmsom-audience';
  const strongJwtSecret = 'averysecurejwtsecretwithmorethan32characters!!';

  beforeEach(() => {
    process.env.JWT_SECRET = strongJwtSecret;
    prisma = new MockPrismaService();
    userAccountService = new UserAccountService(prisma as any);
    process.env.OAUTH_OIDC_DEMO_SECRET = providerSecret;
    process.env.OAUTH_OIDC_DEMO_AUDIENCE = providerAudience;
    process.env.TOTP_ENCRYPTION_KEY = '12345678901234567890123456789012';
    authService = new AuthService(prisma as any, undefined as any, userAccountService as any);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.TOTP_ENCRYPTION_KEY;
  });

  it('requires a configured and strong JWT secret', () => {
    delete process.env.JWT_SECRET;
    expect(() => new AuthService(prisma as any, undefined as any, userAccountService as any)).toThrow(
      'JWT secret is not configured',
    );

    process.env.JWT_SECRET = 'too-short-secret';
    expect(() => new AuthService(prisma as any, undefined as any, userAccountService as any)).toThrow(
      'JWT secret must be at least 32 characters long',
    );
  });

  it('registers users with hashed passwords and prevents duplicates per tenant', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T1', plan: 'pro' } });

    const user = await authService.register({
      email: 'user@example.com',
      password: 'supersecret',
      tenantId: tenant.id,
    });

    expect(user.id).toBeDefined();
    expect(prisma.users[0].passwordHash).not.toBe('supersecret');

    await expect(
      authService.register({ email: 'user@example.com', password: 'supersecret', tenantId: tenant.id }),
    ).rejects.toThrow('User already exists');
  });

  it('rejects registrations without a usable password', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T11', plan: 'pro' } });

    await expect(
      authService.register({ email: 'nopass@example.com', password: '', tenantId: tenant.id }),
    ).rejects.toThrow('Password is required');

    await expect(
      authService.register({ email: 'spaces@example.com', password: '   ', tenantId: tenant.id }),
    ).rejects.toThrow('Password is required');
  });

  it('embeds tenantId in signed JWT payload during login', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T2', plan: 'pro' } });
    await authService.register({
      email: 'user@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    });

    const result = (await authService.login({
      email: 'user@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    })) as any;
    const decoded = jwt.verify(result.access_token, strongJwtSecret) as any;

    expect(decoded.tenantId).toBe(tenant.id);
    expect(result.payload.tenantId).toBe(tenant.id);
    expect(decoded.sub).toBe(result.payload.sub);
  });

  it('requires MFA when factors are present and returns a challenge', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA', plan: 'pro' } });
    const user = await authService.register({ email: 'mfa@example.com', password: 'secret123', tenantId: tenant.id });

    const enrollment = await authService.enrollFactor({
      userId: user.id,
      tenantId: tenant.id,
      type: 'totp',
      label: 'auth-app',
    });

    expect((enrollment as any).otpauthUrl).toContain('otpauth://totp/');
    const factor = prisma.mfaFactors.find((f) => f.userId === user.id && f.type === 'totp');
    expect(factor).toBeDefined();

    const firstStep = (await authService.login({
      email: 'mfa@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    })) as any;
    expect(firstStep.mfaRequired).toBe(true);
    expect(firstStep.factor.id).toBe(factor.id);
    expect(firstStep.code).toBeUndefined();

    const challenge = prisma.mfaChallenges.find((c) => c.id === firstStep.challengeId);
    const totpCode = challenge?.code;

    const verified = await authService.verifyMfa({ challengeId: firstStep.challengeId, code: totpCode } as any);
    expect(verified.access_token).toBeDefined();
  });

  it('rejects reused MFA codes by challenge', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA2', plan: 'pro' } });
    const user = await authService.register({ email: 'reuse@example.com', password: 'secret123', tenantId: tenant.id });

    const factor = await authService.enrollFactor({
      userId: user.id,
      tenantId: tenant.id,
      type: 'sms',
      label: 'sms-device',
    });

    const firstStep = (await authService.login({
      email: 'reuse@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    })) as any;

    const challenge = prisma.mfaChallenges.find((c) => c.id === firstStep.challengeId);
    const verified = await authService.verifyMfa({ challengeId: firstStep.challengeId, code: challenge?.code } as any);

    expect(verified.access_token).toBeDefined();
    expect(challenge?.consumedAt).toBeInstanceOf(Date);
    expect(challenge?.code).toBeNull();

    await expect(
      authService.verifyMfa({ challengeId: firstStep.challengeId, code: challenge?.code ?? '' } as any),
    ).rejects.toThrow('Challenge already used');
  });

  it('rejects expired MFA challenges', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA3', plan: 'pro' } });
    const user = await authService.register({ email: 'expired@example.com', password: 'secret123', tenantId: tenant.id });

    const factor = await authService.enrollFactor({
      userId: user.id,
      tenantId: tenant.id,
      type: 'email',
      label: 'email-device',
    });

    const expiredChallenge = prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        factorId: factor.id,
        code: '123456',
        expiresAt: new Date(Date.now() - 60 * 1000),
        channelHint: 'email-device',
      },
    });

    await expect(
      authService.verifyMfa({ challengeId: expiredChallenge.id, code: '123456' } as any),
    ).rejects.toThrow('Challenge expired');
  });

  it('rejects TOTP verifications with malformed secrets', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA-BAD', plan: 'pro' } });
    const user = await authService.register({ email: 'broken@example.com', password: 'secret123', tenantId: tenant.id });

    const factor = prisma.mfaFactor.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        type: 'totp',
        label: 'bad',
        enabled: true,
        secret: (authService as any).encryptTotpSecret('INVALID!SECRET'),
      },
    });

    const challenge = prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        factorId: factor.id,
        code: '000000',
        expiresAt: new Date(Date.now() + 60 * 1000),
        channelHint: 'bad',
      },
    });

    await expect(authService.verifyMfa({ challengeId: challenge.id, code: '111111' } as any)).rejects.toThrow(
      'Invalid TOTP secret format',
    );
  });

  it('rejects TOTP verifications with short secrets', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA-SHORT', plan: 'pro' } });
    const user = await authService.register({ email: 'short@example.com', password: 'secret123', tenantId: tenant.id });

    const factor = prisma.mfaFactor.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        type: 'totp',
        label: 'short',
        enabled: true,
        secret: (authService as any).encryptTotpSecret('SHORTKEY'),
      },
    });

    const challenge = prisma.mfaChallenge.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        factorId: factor.id,
        code: '000000',
        expiresAt: new Date(Date.now() + 60 * 1000),
        channelHint: 'short',
      },
    });

    await expect(authService.verifyMfa({ challengeId: challenge.id, code: '222222' } as any)).rejects.toThrow(
      'TOTP secret too short',
    );
  });

  it('rejects TOTP enrollment when encryption key is missing', async () => {
    delete process.env.TOTP_ENCRYPTION_KEY;
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA-NOKEY', plan: 'pro' } });
    const user = await authService.register({ email: 'missingkey@example.com', password: 'secret123', tenantId: tenant.id });

    await expect(
      authService.enrollFactor({ userId: user.id, tenantId: tenant.id, type: 'totp', label: 'auth-app' }),
    ).rejects.toThrow('TOTP encryption key is not configured');
  });

  it('rejects TOTP enrollment when encryption key is too weak', async () => {
    process.env.TOTP_ENCRYPTION_KEY = 'short-key';
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-MFA-WEAKKEY', plan: 'pro' } });
    const user = await authService.register({ email: 'weakkey@example.com', password: 'secret123', tenantId: tenant.id });

    await expect(
      authService.enrollFactor({ userId: user.id, tenantId: tenant.id, type: 'totp', label: 'auth-app' }),
    ).rejects.toThrow('TOTP encryption key is too weak');
  });

  it('supports logging in via OAuth provider mapping identities to users', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-OAUTH', plan: 'pro' } });

    const idToken = jwt.sign(
      { sub: 'abc-123', aud: providerAudience, email: 'federated@example.com' },
      providerSecret,
      { expiresIn: '1h' },
    );

    const firstLogin = await authService.oauthLogin({
      provider: 'oidc-demo',
      providerUserId: 'abc-123',
      tenantId: tenant.id,
      idToken,
    });

    expect(firstLogin.access_token).toBeDefined();
    expect(prisma.oauthIdentities).toHaveLength(1);
    expect(prisma.oauthIdentities[0].providerUserId).toBe('abc-123');

    const secondLogin = await authService.oauthLogin({
      provider: 'oidc-demo',
      providerUserId: 'abc-123',
      tenantId: tenant.id,
      idToken,
    });

    expect(secondLogin.access_token).toBeDefined();
    expect(prisma.users).toHaveLength(1);
  });

  it('rejects OAuth logins without a valid token', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T-OAUTH2', plan: 'pro' } });

    await expect(
      authService.oauthLogin({ provider: 'oidc-demo', providerUserId: 'missing', tenantId: tenant.id }),
    ).rejects.toThrow('OAuth token is required');

    const mismatchedToken = jwt.sign({ sub: 'wrong', aud: providerAudience }, providerSecret, { expiresIn: '1h' });

    await expect(
      authService.oauthLogin({
        provider: 'oidc-demo',
        providerUserId: 'abc-123',
        tenantId: tenant.id,
        idToken: mismatchedToken,
      }),
    ).rejects.toThrow('Invalid OAuth token');
  });

  it('rejects login for inactive tenants or users', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T3', plan: 'pro', isActive: false } });

    await expect(
      authService.login({ email: 'ghost@example.com', password: 'secret', tenantId: tenant.id }),
    ).rejects.toThrow('Tenant inactive');

    const activeTenant = prisma.tenant.create({ data: { name: 'Tenant 2', code: 'T4', plan: 'pro' } });
    const user = await authService.register({
      email: 'user2@example.com',
      password: 'secret123',
      tenantId: activeTenant.id,
    });

    await authService.updateCredentials(user.id, { isActive: false });

    await expect(
      authService.login({ email: 'user2@example.com', password: 'secret123', tenantId: activeTenant.id }),
    ).rejects.toThrow('User inactive');
  });

  it('finds users by tenant and email and updates credentials', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T5', plan: 'pro' } });
    const user = await authService.register({
      email: 'lookup@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    });

    const found = await authService.findUser(tenant.id, 'lookup@example.com');
    expect(found.email).toBe('lookup@example.com');
    expect(found).not.toHaveProperty('passwordHash');

    const updated = await authService.updateCredentials(user.id, { password: 'newpassword', isActive: true });
    expect(updated.isActive).toBe(true);
    expect(prisma.users[0].passwordHash).not.toBe('newpassword');
  });

  it('validates tenant existence and activity when finding users', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T5b', plan: 'pro' } });
    const inactiveTenant = prisma.tenant.create({
      data: { name: 'Inactive', code: 'T5c', plan: 'pro', isActive: false },
    });

    await authService.register({ email: 'active@example.com', password: 'secret123', tenantId: tenant.id });
    prisma.user.create({
      data: { email: 'inactive@example.com', tenantId: inactiveTenant.id, passwordHash: 'hash', isActive: true },
    });

    await expect(authService.findUser('missing-tenant', 'ghost@example.com')).rejects.toThrow('Tenant not found');
    await expect(authService.findUser(inactiveTenant.id, 'inactive@example.com')).rejects.toThrow('Tenant inactive');
  });

  it('lists users by tenant with active tenant validation', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T6', plan: 'pro' } });
    const inactiveTenant = prisma.tenant.create({
      data: { name: 'Inactive', code: 'T7', plan: 'pro', isActive: false },
    });

    await authService.register({ email: 'one@example.com', password: 'pw', tenantId: tenant.id });
    await authService.register({ email: 'two@example.com', password: 'pw', tenantId: tenant.id });

    const users = await authService.listUsers(tenant.id);
    expect(users).toHaveLength(2);
    expect(users.every((u: any) => !('passwordHash' in u))).toBe(true);

    await expect(authService.listUsers(inactiveTenant.id)).rejects.toThrow('Tenant inactive');
    await expect(authService.listUsers('missing-tenant')).rejects.toThrow('Tenant not found');
  });

  it('deactivates a user and prevents double deactivation', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T8', plan: 'pro' } });
    const user = await authService.register({ email: 'deact@example.com', password: 'pw', tenantId: tenant.id });

    const result = await authService.deactivateUser(user.id);
    expect(result.isActive).toBe(false);
    expect(prisma.users.find((u) => u.id === user.id)?.isActive).toBe(false);

    await expect(authService.deactivateUser(user.id)).rejects.toThrow('User already inactive');
  });

  it('deletes an active user only when tenant is active', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T9', plan: 'pro' } });
    const inactiveTenant = prisma.tenant.create({
      data: { name: 'Inactive', code: 'T10', plan: 'pro', isActive: false },
    });
    const activeUser = await authService.register({ email: 'active@example.com', password: 'pw', tenantId: tenant.id });
    const inactiveUser = prisma.user.create({
      data: { email: 'inactive@example.com', passwordHash: 'pw', tenantId: inactiveTenant.id, isActive: true },
    });

    const deleted = await authService.deleteUser(activeUser.id);
    expect(deleted.id).toBe(activeUser.id);
    expect(prisma.users.find((u) => u.id === activeUser.id)).toBeUndefined();

    await expect(authService.deleteUser(inactiveUser.id)).rejects.toThrow('Tenant inactive');
    await authService.deactivateUser(inactiveUser.id).catch(() => undefined);
    await expect(authService.deleteUser(inactiveUser.id)).rejects.toThrow('Tenant inactive');

    await expect(authService.deleteUser('missing')).rejects.toThrow('User not found');
  });
});
