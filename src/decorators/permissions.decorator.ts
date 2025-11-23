import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';

export const PERMISSIONS_KEY = 'required_permissions';
export type PermissionDefinition = { resource: PermissionResource; action: PermissionAction };

export const Permissions = (resource: PermissionResource, action: PermissionAction) =>
  SetMetadata(PERMISSIONS_KEY, [{ resource, action } as PermissionDefinition]);
