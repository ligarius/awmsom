import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_PASSWORD: Joi.string().allow('', null),
  JWT_SECRET: Joi.string().min(32).required(),
  TOTP_ENCRYPTION_KEY: Joi.string().min(32).required(),
  AUDIT_LOG_ENCRYPTION_KEY: Joi.string().min(32).required(),
  AUDIT_LOG_RETENTION_DAYS: Joi.number().integer().min(1).default(365),
  RBAC_EXCESSIVE_PERMISSION_THRESHOLD: Joi.number().integer().min(1).default(20),
  KPIS_CACHE_TTL: Joi.number().integer().min(1).default(300),
  TRACE_CACHE_TTL: Joi.number().integer().min(1).default(120),
  OAUTH_FLOW_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  OAUTH_OIDC_DEMO_AUTHORIZE_URL: Joi.string()
    .uri()
    .when('OAUTH_FLOW_ENABLED', { is: true, then: Joi.required() }),
  OAUTH_OIDC_DEMO_SECRET: Joi.string()
    .min(1)
    .when('OAUTH_FLOW_ENABLED', { is: true, then: Joi.required() }),
  OAUTH_OIDC_DEMO_AUDIENCE: Joi.string()
    .min(1)
    .when('OAUTH_FLOW_ENABLED', { is: true, then: Joi.required() }),
});
