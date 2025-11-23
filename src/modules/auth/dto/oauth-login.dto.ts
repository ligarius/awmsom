import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthLoginDto {
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsNotEmpty()
  providerUserId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
