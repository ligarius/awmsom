import { IsOptional, IsString } from 'class-validator';

export class TmsShipmentDto {
  @IsString()
  trackingCode!: string;

  @IsString()
  carrier!: string;

  @IsOptional()
  @IsString()
  destination?: string;
}
