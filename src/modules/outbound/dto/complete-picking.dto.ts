import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CompletePickingDto {
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  batch?: string;
}
