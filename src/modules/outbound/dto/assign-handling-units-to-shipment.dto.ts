import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignHandlingUnitsToShipmentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  handlingUnitIds!: string[];
}
