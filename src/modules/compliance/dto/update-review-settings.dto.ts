import { IsDateString, IsIn, IsInt, Min } from 'class-validator';

export class UpdateReviewSettingsDto {
  @IsIn(['monthly', 'quarterly', 'yearly'])
  frequency!: string;

  @IsDateString()
  nextReviewDate!: string;

  @IsInt()
  @Min(0)
  notifyDaysBefore!: number;
}
