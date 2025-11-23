import { IsDateString, IsOptional, IsPositive } from 'class-validator';

export class AuditExportQueryDto {
  @IsPositive()
  @IsOptional()
  page?: number;

  @IsPositive()
  @IsOptional()
  limit?: number;

  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;
}
