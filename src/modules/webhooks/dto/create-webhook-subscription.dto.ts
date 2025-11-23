import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateWebhookSubscriptionDto {
  @IsString()
  eventType!: string;

  @IsString()
  targetUrl!: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
