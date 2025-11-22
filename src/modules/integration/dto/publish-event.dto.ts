import { IsObject, IsOptional, IsString } from 'class-validator';

export class PublishEventDto {
  @IsString()
  eventType!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
