/**
 * Shared constants for the WMS frontend. Centralizing URLs and storage
 * keys helps avoid magic strings and eases future migrations.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const AUTH_TOKEN_COOKIE = "awms_token";
export const AUTH_REFRESH_COOKIE = "awms_refresh_token";

export const APP_SECTIONS = [
  { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { label: "Ejecutivo", href: "/dashboard/executive", icon: "bar-chart-3" },
  { label: "Operaciones", href: "/dashboard/operations", icon: "activity" },
  { label: "Inventario 360", href: "/dashboard/inventory", icon: "boxes" },
  { label: "Performance", href: "/dashboard/performance", icon: "gauge" },
  { label: "Inbound", href: "/inbound", icon: "truck" },
  { label: "Outbound", href: "/outbound", icon: "ship" },
  { label: "Picking", href: "/picking", icon: "hand" },
  { label: "Waves", href: "/waves", icon: "waves" },
  { label: "Packing", href: "/packing", icon: "package" },
  { label: "Despachos", href: "/shipments", icon: "send" },
  { label: "Inventario", href: "/inventory", icon: "boxes" },
  { label: "Balanceo", href: "/balancing", icon: "scale" },
  { label: "Movimientos", href: "/movements", icon: "arrow-left-right" },
  { label: "Ajustes", href: "/adjustments", icon: "scales" },
  { label: "Cycle Count", href: "/cycle-count", icon: "clipboard-list" },
  { label: "Slotting", href: "/slotting", icon: "grid" },
  { label: "Trazabilidad", href: "/traceability", icon: "route" },
  { label: "Reportes", href: "/reports", icon: "file-chart-column" },
  { label: "Configuración", href: "/settings", icon: "settings" }
];
