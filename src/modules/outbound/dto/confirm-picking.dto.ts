import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';

class ConfirmPickingLineDto {
  @IsUUID()
  pickingTaskLineId: string;

  @IsNumber()
  quantityPicked: number;
}

export class ConfirmPickingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmPickingLineDto)
  lines: ConfirmPickingLineDto[];
}
