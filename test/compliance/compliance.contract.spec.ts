import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ComplianceModule } from '../../src/modules/compliance/compliance.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Compliance settings contract', () => {
  let app: INestApplication;

  const prismaMock: Partial<PrismaService> = {
    complianceSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    } as any,
    permissionReviewSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    } as any,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ComplianceModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.use((req, _res, next) => {
      (req as any).user = {
        id: 'user-1',
        tenantId: 'tenant-1',
        permissions: ['compliance:manage'],
      };
      next();
    });
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns retention settings for the tenant', async () => {
    (prismaMock.complianceSetting?.findUnique as jest.Mock).mockResolvedValueOnce({
      retentionDays: 120,
      updatedAt: new Date('2024-06-01'),
      updatedBy: 'auditor-1',
    });

    const response = await request(app.getHttpServer())
      .get('/compliance/settings')
      .expect(200);

    expect(response.body.retentionDays).toBe(120);
    expect(response.body.lastUpdatedAt).toBeTruthy();
    expect(prismaMock.complianceSetting?.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
    });
  });

  it('updates retention settings', async () => {
    (prismaMock.complianceSetting?.upsert as jest.Mock).mockResolvedValueOnce({
      retentionDays: 90,
      updatedAt: new Date('2024-07-01T00:00:00Z'),
      updatedBy: 'user-1',
    });

    const response = await request(app.getHttpServer())
      .patch('/compliance/settings')
      .send({ retentionDays: 90 })
      .expect(200);

    expect(response.body.retentionDays).toBe(90);
    expect(prismaMock.complianceSetting?.upsert).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      create: { tenantId: 'tenant-1', retentionDays: 90, updatedBy: 'user-1' },
      update: { retentionDays: 90, updatedBy: 'user-1' },
    });
  });

  it('returns review settings for the tenant', async () => {
    (prismaMock.permissionReviewSetting?.findUnique as jest.Mock).mockResolvedValueOnce({
      frequency: 'monthly',
      nextReviewDate: new Date('2024-08-15'),
      notifyDaysBefore: 5,
    });

    const response = await request(app.getHttpServer())
      .get('/audit/reviews/settings')
      .expect(200);

    expect(response.body.frequency).toBe('monthly');
    expect(response.body.notifyDaysBefore).toBe(5);
    expect(prismaMock.permissionReviewSetting?.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
    });
  });

  it('updates review scheduling settings', async () => {
    (prismaMock.permissionReviewSetting?.upsert as jest.Mock).mockResolvedValueOnce({
      frequency: 'yearly',
      nextReviewDate: new Date('2025-01-10T00:00:00Z'),
      notifyDaysBefore: 14,
    });

    const response = await request(app.getHttpServer())
      .patch('/audit/reviews/settings')
      .send({ frequency: 'yearly', nextReviewDate: '2025-01-10', notifyDaysBefore: 14 })
      .expect(200);

    expect(response.body.frequency).toBe('yearly');
    expect(response.body.notifyDaysBefore).toBe(14);
    expect(prismaMock.permissionReviewSetting?.upsert).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      create: {
        tenantId: 'tenant-1',
        frequency: 'yearly',
        nextReviewDate: new Date('2025-01-10'),
        notifyDaysBefore: 14,
        updatedBy: 'user-1',
      },
      update: {
        frequency: 'yearly',
        nextReviewDate: new Date('2025-01-10'),
        notifyDaysBefore: 14,
        updatedBy: 'user-1',
      },
    });
  });
});
