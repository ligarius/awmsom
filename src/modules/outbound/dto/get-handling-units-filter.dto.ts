import { IsEnum, IsOptional, IsString } from 'class-validator';
import { HandlingUnitType } from '@prisma/client';

export class GetHandlingUnitsFilterDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  outboundOrderId?: string;

  @IsOptional()
  @IsEnum(HandlingUnitType)
  handlingUnitType?: HandlingUnitType;
}
