import axios from 'axios';
import { WebhooksService } from '../src/modules/webhooks/webhooks.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhooksService', () => {
  const prisma: any = {
    webhookSubscription: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit: any = { recordLog: jest.fn() };
  const service = new WebhooksService(prisma as any, audit as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits events to subscriptions', async () => {
    prisma.webhookSubscription.findMany.mockResolvedValue([
      { id: '1', tenantId: 't1', eventType: 'TEST', targetUrl: 'http://example.com', secret: 's', isActive: true },
    ]);
    mockedAxios.post.mockResolvedValue({ status: 200 } as any);
    await service.emitEvent('t1', 'TEST', { hello: 'world' });
    expect(mockedAxios.post).toHaveBeenCalled();
  });
});
