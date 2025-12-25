import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAdjustmentDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @IsIn(['AUMENTO', 'DISMINUCION'])
  type!: 'AUMENTO' | 'DISMINUCION';

  @IsOptional()
  @IsString()
  batch?: string;

  @IsString()
  location!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
