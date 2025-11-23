import { AccessReviewStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAccessReviewStatusDto {
  @IsEnum(AccessReviewStatus)
  status!: AccessReviewStatus;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;

  @IsString()
  @IsOptional()
  summary?: string;
}
