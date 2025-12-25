import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { CycleCountStatus } from '@prisma/client';

export class CreateCycleCountLineInput {
  @IsUUID()
  productId!: string;

  @IsUUID()
  locationId!: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsString()
  uom!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  expectedQty?: number;
}

export class CreateCycleCountTaskDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCycleCountLineInput)
  lines?: CreateCycleCountLineInput[];
}

export class AddCycleCountLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCycleCountLineInput)
  lines!: CreateCycleCountLineInput[];
}

export class SubmitCycleCountLineDto {
  @IsUUID()
  lineId!: string;

  @Type(() => Number)
  @IsNumber()
  countedQty!: number;
}

export class SubmitCycleCountResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitCycleCountLineDto)
  lines!: SubmitCycleCountLineDto[];
}

export class CycleCountQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(CycleCountStatus)
  status?: CycleCountStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
