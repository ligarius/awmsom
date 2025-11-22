import { IsDateString, IsOptional } from 'class-validator';

export class DispatchShipmentDto {
  @IsOptional()
  @IsDateString()
  actualDeparture?: string;
}
