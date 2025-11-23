import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';

export const PERMISSIONS_KEY = 'required_permissions';
export type PermissionDefinition = { resource: PermissionResource; action: PermissionAction };

export function Permissions(
  resourceOrPermission: PermissionResource | PermissionDefinition,
  action?: PermissionAction,
  ...rest: PermissionDefinition[]
): ClassDecorator & MethodDecorator {
  const normalizedPermissions: PermissionDefinition[] =
    typeof resourceOrPermission === 'string'
      ? [{ resource: resourceOrPermission, action: action as PermissionAction }, ...rest]
      : [resourceOrPermission, ...(action ? rest : [])];

  return SetMetadata(PERMISSIONS_KEY, normalizedPermissions);
}
