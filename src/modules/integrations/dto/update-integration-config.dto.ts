import { IntegrationType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateIntegrationConfigDto {
  @IsOptional()
  @IsEnum(IntegrationType)
  type?: IntegrationType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  extraConfig?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
