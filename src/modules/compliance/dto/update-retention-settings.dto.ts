import { IsInt, IsPositive } from 'class-validator';

export class UpdateRetentionSettingsDto {
  @IsInt()
  @IsPositive()
  retentionDays!: number;
}
