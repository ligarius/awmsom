"use client";

import { hasPermission, hasRole } from "@/lib/auth";
import { useMemo } from "react";

/**
 * Hook ligero que expone permisos de alto nivel para simplificar la UI.
 * Usa las funciones de auth que leen del store global de usuario.
 */
export function usePermissions() {
  const canRead = useMemo(() => hasPermission("read"), []);
  const canWrite = useMemo(() => hasPermission("write"), []);
  const canManage = useMemo(() => hasPermission("manage") || hasRole("ADMIN"), []);
  const canAccessSaaS = useMemo(() => hasPermission("saas:access") || hasRole("SUPER_ADMIN"), []);
  const canReadWmsConfig = useMemo(() => hasPermission("CONFIG_WMS_READ") || hasRole("ADMIN"), []);
  const canWriteWmsConfig = useMemo(() => hasPermission("CONFIG_WMS_WRITE") || hasRole("ADMIN"), []);

  const canInboundRead = useMemo(() => hasPermission("INBOUND_READ"), []);
  const canInboundExecute = useMemo(() => hasPermission("INBOUND_EXECUTE"), []);
  const canInventoryRead = useMemo(() => hasPermission("INVENTORY_READ"), []);
  const canMovementsWrite = useMemo(() => hasPermission("MOVEMENTS_WRITE"), []);
  const canAdjustmentsWrite = useMemo(() => hasPermission("ADJUSTMENT_WRITE"), []);
  const canCycleCountCreate = useMemo(() => hasPermission("CYCLECOUNT_CREATE"), []);
  const canCycleCountExecute = useMemo(() => hasPermission("CYCLECOUNT_EXECUTE"), []);
  const canOutboundRead = useMemo(() => hasPermission("OUTBOUND_READ"), []);
  const canOutboundCreate = useMemo(() => hasPermission("OUTBOUND_CREATE"), []);
  const canOutboundRelease = useMemo(() => hasPermission("OUTBOUND_RELEASE"), []);
  const canPickingRead = useMemo(() => hasPermission("PICKING_READ"), []);
  const canPickingExecute = useMemo(() => hasPermission("PICKING_EXECUTE"), []);
  const canWaveCreate = useMemo(() => hasPermission("WAVES_CREATE"), []);
  const canWavePlan = useMemo(() => hasPermission("WAVES_PLAN"), []);
  const canWaveRelease = useMemo(() => hasPermission("WAVES_RELEASE"), []);
  const canPackingExecute = useMemo(() => hasPermission("PACKING_EXECUTE"), []);
  const canShipmentsRead = useMemo(() => hasPermission("SHIPMENTS_READ"), []);
  const canShipmentsExecute = useMemo(() => hasPermission("SHIPMENTS_EXECUTE"), []);

  return {
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
    canShipmentsExecute
  };
}
