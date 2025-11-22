import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  carrierRef?: string;

  @IsOptional()
  @IsString()
  vehicleRef?: string;

  @IsOptional()
  @IsString()
  routeRef?: string;

  @IsOptional()
  @IsDateString()
  scheduledDeparture?: string;
}
