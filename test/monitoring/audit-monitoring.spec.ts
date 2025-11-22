import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuditModule } from '../../src/modules/audit/audit.module';
import { MonitoringModule } from '../../src/modules/monitoring/monitoring.module';

describe('Audit and Monitoring modules (e2e-lite)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuditModule, MonitoringModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records audit events via middleware', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/events')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((event: any) => event.path === '/audit/events'),
    ).toBe(true);
  });

  it('captures request traces via interceptor', async () => {
    await request(app.getHttpServer()).get('/audit/events').expect(200);
    const response = await request(app.getHttpServer())
      .get('/audit/traces')
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(
      response.body.some((trace: any) => trace.path === '/audit/events'),
    ).toBeTruthy();
  });

  it('provides consolidated health information', async () => {
    const response = await request(app.getHttpServer())
      .get('/monitoring/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.metrics.totalRequests).toBeGreaterThan(0);
    expect(response.body.audit.events).toBeGreaterThan(0);
  });

  it('exposes prometheus metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/monitoring/metrics')
      .expect(200);

    expect(response.text).toContain('http_requests_total');
    expect(response.headers['content-type']).toContain('text/plain');
  });
});
