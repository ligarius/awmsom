import { IsBoolean, IsUUID } from 'class-validator';

export class ApproveSlottingDto {
  @IsUUID()
  recommendationId!: string;

  @IsBoolean()
  approve!: boolean;
}
