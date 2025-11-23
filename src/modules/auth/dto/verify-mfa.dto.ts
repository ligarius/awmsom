import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
