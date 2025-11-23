import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MfaEnrollDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsIn(['totp', 'email', 'sms'])
  type!: 'totp' | 'email' | 'sms';

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
