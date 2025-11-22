import { Injectable } from '@nestjs/common';
import { ConsumeEventDto } from '../dto/consume-event.dto';
import { PublishEventDto } from '../dto/publish-event.dto';

@Injectable()
export class EventQueueService {
  publish(dto: PublishEventDto) {
    return {
      status: 'published',
      eventType: dto.eventType,
      payload: dto.payload ?? {},
    };
  }

  consume(dto: ConsumeEventDto) {
    return {
      status: 'consumed',
      source: dto.source,
      processedAt: new Date().toISOString(),
      payload: dto.payload ?? {},
    };
  }
}
