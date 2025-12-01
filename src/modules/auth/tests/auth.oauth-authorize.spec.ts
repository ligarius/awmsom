import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('/auth/oauth/authorize endpoint', () => {
  let app: INestApplication;
  const authService = {
    buildOAuthAuthorizeUrl: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await app.close();
  });

  it('redirects to the provider authorize URL when parameters are valid', async () => {
    authService.buildOAuthAuthorizeUrl.mockResolvedValueOnce('https://provider.example.com/authz?provider=oidc-demo');

    await request(app.getHttpServer())
      .get('/auth/oauth/authorize')
      .query({ provider: 'oidc-demo', tenantId: 'tenant-1', redirect_uri: 'https://app.example.com/callback' })
      .expect(302)
      .expect('Location', 'https://provider.example.com/authz?provider=oidc-demo');

    expect(authService.buildOAuthAuthorizeUrl).toHaveBeenCalledWith(
      'oidc-demo',
      'tenant-1',
      'https://app.example.com/callback',
    );
  });

  it('propagates errors when the service rejects the authorize request', async () => {
    authService.buildOAuthAuthorizeUrl.mockRejectedValueOnce(new NotFoundException('Tenant not found'));

    await request(app.getHttpServer())
      .get('/auth/oauth/authorize')
      .query({ provider: 'oidc-demo', tenantId: 'missing-tenant', redirect_uri: 'https://app.example.com/callback' })
      .expect(404);
  });
});
