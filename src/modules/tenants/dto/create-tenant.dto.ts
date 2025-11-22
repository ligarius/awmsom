import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
