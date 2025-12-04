import { configValidationSchema } from './validation';

describe('configValidationSchema', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/awmsom',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_DB: 0,
    JWT_SECRET: 'averysecurejwtsecretwithmorethan32characters!!',
    TOTP_ENCRYPTION_KEY: '12345678901234567890123456789012',
    AUDIT_LOG_ENCRYPTION_KEY: '12345678901234567890123456789012',
  };

  it('requires OAuth provider configuration when the OAuth flow is enabled', () => {
    const { error } = configValidationSchema.validate(
      { ...baseEnv, OAUTH_FLOW_ENABLED: 'true' },
      { abortEarly: false },
    );

    expect(error).toBeDefined();
    expect(error?.message).toContain('OAUTH_OIDC_DEMO_SECRET');
    expect(error?.message).toContain('OAUTH_OIDC_DEMO_AUTHORIZE_URL');
    expect(error?.message).toContain('OAUTH_OIDC_DEMO_AUDIENCE');
  });

  it('accepts OAuth provider variables when they are supplied', () => {
    const { error, value } = configValidationSchema.validate(
      {
        ...baseEnv,
        OAUTH_FLOW_ENABLED: 'true',
        OAUTH_OIDC_DEMO_SECRET: 'provider-secret',
        OAUTH_OIDC_DEMO_AUTHORIZE_URL: 'https://oidc-demo.example.com/authorize',
        OAUTH_OIDC_DEMO_AUDIENCE: 'awmsom-audience',
      },
      { abortEarly: false },
    );

    expect(error).toBeUndefined();
    expect(value.OAUTH_FLOW_ENABLED).toBe(true);
  });
});
