import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateWebhookSubscriptionDto {
  @IsOptional()
  @IsString()
  targetUrl?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
