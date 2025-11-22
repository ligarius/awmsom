import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PickingTaskStatus } from '@prisma/client';

export class GetPickingTasksFilterDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(PickingTaskStatus)
  status?: PickingTaskStatus;

  @IsOptional()
  @IsString()
  pickerId?: string;
}
