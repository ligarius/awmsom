/**
 * Shared constants for the WMS frontend. Centralizing URLs and storage
 * keys helps avoid magic strings and eases future migrations.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const AUTH_TOKEN_COOKIE = "awms_token";
export const AUTH_REFRESH_COOKIE = "awms_refresh_token";

export const APP_SECTIONS = [
  { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { label: "Inbound", href: "/inbound", icon: "truck" },
  { label: "Outbound", href: "/outbound", icon: "ship" },
  { label: "Picking", href: "/picking", icon: "hand" },
  { label: "Waves", href: "/waves", icon: "waves" },
  { label: "Packing", href: "/packing", icon: "package" },
  { label: "Despachos", href: "/shipments", icon: "send" },
  { label: "Inventario", href: "/inventory", icon: "boxes" },
  { label: "Movimientos", href: "/movements", icon: "arrow-left-right" },
  { label: "Ajustes", href: "/adjustments", icon: "scales" },
  { label: "Cycle Count", href: "/cycle-count", icon: "clipboard-list" },
  { label: "Configuración", href: "/settings", icon: "settings" }
];
