import type { PlanCode } from "@/lib/plans";

/**
 * Shared constants for the WMS frontend. Centralizing URLs and storage
 * keys helps avoid magic strings and eases future migrations.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const AUTH_TOKEN_COOKIE = "awms_token";
export const AUTH_REFRESH_COOKIE = "awms_refresh_token";
export const OAUTH_STATE_COOKIE = "awms_oauth_state";
export const OAUTH_NONCE_COOKIE = "awms_oauth_nonce";

export interface AppNavItem {
  label: string;
  href: string;
  icon: string;
  minPlan?: PlanCode;
}

export interface AppNavSection {
  label: string;
  items: AppNavItem[];
}

export const APP_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "Panel",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard", minPlan: "BASIC" },
      { label: "Ejecutivo", href: "/dashboard/executive", icon: "bar-chart-3", minPlan: "PRO" },
      { label: "Operaciones", href: "/dashboard/operations", icon: "activity", minPlan: "PRO" },
      { label: "Inventario 360", href: "/dashboard/inventory", icon: "boxes", minPlan: "PRO" },
      { label: "Performance", href: "/dashboard/performance", icon: "gauge", minPlan: "ENTERPRISE" }
    ]
  },
  {
    label: "WMS",
    items: [
      { label: "Inbound", href: "/inbound", icon: "truck", minPlan: "BASIC" },
      { label: "Outbound", href: "/outbound", icon: "ship", minPlan: "BASIC" },
      { label: "Picking", href: "/picking", icon: "hand", minPlan: "PRO" },
      { label: "Waves", href: "/waves", icon: "waves", minPlan: "PRO" },
      { label: "Packing", href: "/packing", icon: "package", minPlan: "PRO" },
      { label: "Despachos", href: "/shipments", icon: "send", minPlan: "PRO" },
      { label: "Inventario", href: "/inventory", icon: "boxes", minPlan: "BASIC" },
      { label: "Balanceo", href: "/balancing", icon: "scale", minPlan: "ENTERPRISE" },
      { label: "Movimientos", href: "/movements", icon: "arrow-left-right", minPlan: "BASIC" },
      { label: "Ajustes", href: "/adjustments", icon: "scales", minPlan: "BASIC" },
      { label: "Cycle Count", href: "/cycle-count", icon: "clipboard-list", minPlan: "PRO" },
      { label: "Slotting", href: "/slotting", icon: "grid", minPlan: "ENTERPRISE" },
      { label: "Trazabilidad", href: "/traceability", icon: "route", minPlan: "PRO" },
      { label: "Reportes", href: "/reports", icon: "file-chart-column", minPlan: "BASIC" }
    ]
  },
  {
    label: "Administracion",
    items: [
      { label: "Configuracion", href: "/settings", icon: "settings", minPlan: "BASIC" },
      { label: "Cumplimiento", href: "/settings/compliance", icon: "shield-check", minPlan: "ENTERPRISE" }
    ]
  },
  {
    label: "SaaS",
    items: [
      { label: "Panel SaaS", href: "/saas", icon: "layout-grid" },
      { label: "Empresas", href: "/saas/tenants", icon: "building-2" },
      { label: "Crear empresa", href: "/saas/tenants/create", icon: "plus-circle" }
    ]
  }
];
