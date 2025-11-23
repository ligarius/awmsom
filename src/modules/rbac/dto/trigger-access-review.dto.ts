import { IsDateString, IsOptional, IsString } from 'class-validator';

export class TriggerAccessReviewDto {
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @IsString()
  @IsOptional()
  responsibleUserId?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;
}
