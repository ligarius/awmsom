import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
