"use client";

import { hasPermission, hasRole } from "@/lib/auth";
import { canAccessSaas } from "@/lib/navigation";
import { useUserStore } from "@/store/user.store";
import { useAuthContext } from "@/providers/AuthProvider";

/**
 * Hook ligero que expone permisos de alto nivel para simplificar la UI.
 * Usa las funciones de auth que leen del store global de usuario.
 */
export function usePermissions() {
  const { initializing } = useAuthContext();
  const user = useUserStore((state) => state.user);

  const hasAnyPermission = (...permissions: string[]) => permissions.some((permission) => hasPermission(permission));
  const isPlatform = hasRole("OWNER") || hasRole("PLATFORM_ADMIN");
  const isTenantAdmin = hasRole("ADMIN");
  const isLoading = initializing && !user;
  const allowAll = isPlatform || isTenantAdmin || isLoading;

  const canRead = allowAll || hasPermission("READ");
  const canWrite = allowAll || hasPermission("UPDATE");
  const canManage = allowAll || hasAnyPermission("TENANT_CONFIG:MANAGE", "USERS:MANAGE", "ROLES:MANAGE");
  const canAccessSaaS = canAccessSaas(user);
  const canReadWmsConfig = allowAll || hasAnyPermission("TENANT_CONFIG:READ", "TENANT_CONFIG:CONFIG", "TENANT_CONFIG:UPDATE");
  const canWriteWmsConfig = allowAll || hasAnyPermission("TENANT_CONFIG:UPDATE", "TENANT_CONFIG:CONFIG");

  const canInboundRead = allowAll || hasPermission("INBOUND:READ");
  const canInboundExecute = allowAll || hasAnyPermission("INBOUND:CREATE", "INBOUND:UPDATE", "INBOUND:APPROVE");
  const canInventoryRead = allowAll || hasPermission("INVENTORY:READ");
  const canMovementsWrite = allowAll || hasAnyPermission("INVENTORY:UPDATE", "ADJUSTMENT:CREATE");
  const canAdjustmentsWrite = allowAll || hasAnyPermission("ADJUSTMENT:CREATE", "ADJUSTMENT:UPDATE");
  const canCycleCountCreate = allowAll || hasPermission("CYCLE_COUNT:CREATE");
  const canCycleCountExecute = allowAll || hasAnyPermission("CYCLE_COUNT:UPDATE", "CYCLE_COUNT:APPROVE");
  const canOutboundRead = allowAll || hasPermission("OUTBOUND:READ");
  const canOutboundCreate = allowAll || hasPermission("OUTBOUND:CREATE");
  const canOutboundRelease = allowAll || hasAnyPermission("OUTBOUND:UPDATE", "OUTBOUND:APPROVE");
  const canPickingRead = allowAll || hasPermission("PICKING:READ");
  const canPickingExecute = allowAll || hasAnyPermission("PICKING:UPDATE", "PICKING:APPROVE", "PICKING:CREATE");
  const canWaveCreate = allowAll || hasAnyPermission("OUTBOUND:CREATE", "PICKING:CREATE");
  const canWavePlan = allowAll || hasAnyPermission("OUTBOUND:UPDATE", "PICKING:UPDATE");
  const canWaveRelease = allowAll || hasAnyPermission("OUTBOUND:APPROVE", "PICKING:APPROVE");
  const canPackingExecute = allowAll || hasAnyPermission("PACKING:UPDATE", "PACKING:CREATE");
  const canShipmentsRead = allowAll || hasPermission("SHIPMENT:READ");
  const canShipmentsExecute = allowAll || hasAnyPermission("SHIPMENT:UPDATE", "SHIPMENT:APPROVE", "SHIPMENT:CREATE");
  const canReplenishmentRead = allowAll || hasPermission("INVENTORY:READ");
  const canReplenishmentApprove = allowAll || hasPermission("INVENTORY:APPROVE");
  const canReplenishmentExecute = allowAll || hasAnyPermission("INVENTORY:UPDATE", "INVENTORY:APPROVE");
  const canReplenishmentConfig = allowAll || hasAnyPermission("INVENTORY:CONFIG", "TENANT_CONFIG:CONFIG");
  const canSlottingRead = allowAll || hasPermission("INVENTORY:READ");
  const canSlottingApprove = allowAll || hasPermission("INVENTORY:APPROVE");
  const canSlottingExecute = allowAll || hasAnyPermission("INVENTORY:UPDATE", "INVENTORY:APPROVE");
  const canSlottingConfig = allowAll || hasAnyPermission("INVENTORY:CONFIG", "TENANT_CONFIG:CONFIG");
  const canInventoryAdvancedRead = allowAll || hasPermission("INVENTORY:READ");
  const canManageCompliance = allowAll || hasAnyPermission("COMPLIANCE:MANAGE", "COMPLIANCE:CONFIG");

  return {
    isLoading,
    isPlatform,
    isTenantAdmin,
    canRead,
    canWrite,
    canManage,
    canAccessSaaS,
    canReadWmsConfig,
    canWriteWmsConfig,
    canInboundRead,
    canInboundExecute,
    canInventoryRead,
    canMovementsWrite,
    canAdjustmentsWrite,
    canCycleCountCreate,
    canCycleCountExecute,
    canOutboundRead,
    canOutboundCreate,
    canOutboundRelease,
    canPickingRead,
    canPickingExecute,
    canWaveCreate,
    canWavePlan,
    canWaveRelease,
    canPackingExecute,
    canShipmentsRead,
    canShipmentsExecute,
    canReplenishmentRead,
    canReplenishmentApprove,
    canReplenishmentExecute,
    canReplenishmentConfig,
    canSlottingRead,
    canSlottingApprove,
    canSlottingExecute,
    canSlottingConfig,
    canInventoryAdvancedRead,
    canManageCompliance
  };
}
