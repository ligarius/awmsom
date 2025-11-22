import { HandlingUnitType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateHandlingUnitDto {
  @IsString()
  warehouseId!: string;

  @IsEnum(HandlingUnitType)
  handlingUnitType!: HandlingUnitType;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  externalLabel?: string;

  @IsOptional()
  @IsNumber()
  grossWeight?: number;

  @IsOptional()
  @IsNumber()
  volume?: number;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}
