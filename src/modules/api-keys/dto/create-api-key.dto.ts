import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  canRead?: boolean = true;

  @IsOptional()
  @IsBoolean()
  canWrite?: boolean = false;
}
