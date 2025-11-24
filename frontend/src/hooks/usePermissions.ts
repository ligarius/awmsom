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

  return { canRead, canWrite, canManage, canAccessSaaS, canReadWmsConfig, canWriteWmsConfig };
}
