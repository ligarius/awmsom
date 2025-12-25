import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSaasTenantUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
