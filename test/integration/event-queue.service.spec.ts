import { EventQueueService } from '../../src/modules/integration/services/event-queue.service';

describe('EventQueueService', () => {
  let service: EventQueueService;

  beforeEach(() => {
    service = new EventQueueService();
  });

  it('publishes events with payload', () => {
    const result = service.publish({ eventType: 'inventory.updated', payload: { id: 'INV-1' } });

    expect(result).toEqual({
      status: 'published',
      eventType: 'inventory.updated',
      payload: { id: 'INV-1' },
    });
  });

  it('consumes events and timestamps processing', () => {
    const result = service.consume({ source: 'queue-x', payload: { data: true } });

    expect(result.status).toBe('consumed');
    expect(result.source).toBe('queue-x');
    expect(result.payload).toEqual({ data: true });
    expect(result.processedAt).toEqual(expect.any(String));
  });
});
