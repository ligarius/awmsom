import { IsOptional, IsString } from 'class-validator';

export class CreatePickingTaskDto {
  @IsOptional()
  @IsString()
  pickerId?: string;
}
