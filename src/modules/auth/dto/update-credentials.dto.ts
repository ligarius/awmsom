import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCredentialsDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
