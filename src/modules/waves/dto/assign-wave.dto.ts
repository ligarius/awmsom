import { IsUUID } from 'class-validator';

export class AssignWaveDto {
  @IsUUID()
  waveId!: string;

  @IsUUID()
  pickerUserId!: string;
}
