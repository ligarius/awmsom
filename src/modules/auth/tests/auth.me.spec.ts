import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AuthUserGuard } from '../guards/auth-user.guard';

describe('/auth/me endpoint', () => {
  let app: INestApplication;
  const authService = {
    getAuthenticatedUser: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthUserGuard, { provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await app.close();
  });

  it('responds with the authenticated user when token is valid', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User Example',
      tenantId: 'tenant-1',
      roles: ['admin'],
      permissions: ['users:read'],
    } as any;
    authService.getAuthenticatedUser.mockImplementation(async (_auth, cachedUser) => cachedUser ?? user);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer token')
      .expect(200)
      .expect(user);
  });

  it('returns 401 when no token is provided', async () => {
    authService.getAuthenticatedUser.mockRejectedValueOnce(new UnauthorizedException());

    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
