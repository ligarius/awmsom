import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class QueryWarehousesDto {
  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsInt()
  @IsPositive()
  @Min(1)
  page = 1;

  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
