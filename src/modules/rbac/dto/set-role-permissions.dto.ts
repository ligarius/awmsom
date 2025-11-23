import { PermissionAction, PermissionResource } from '@prisma/client';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionDto {
  @IsEnum(PermissionResource)
  resource!: PermissionResource;

  @IsEnum(PermissionAction)
  action!: PermissionAction;
}

export class SetRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions!: PermissionDto[];
}
