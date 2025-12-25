import type { AuthUser } from "@/types/auth";

const SAAS_ADMIN_ROLES = new Set(["OWNER", "PLATFORM_ADMIN"]);

export function canAccessSaas(user?: AuthUser | null) {
  if (!user) return false;
  const roles = user.roles ?? (user.role ? [user.role] : []);
  return roles.some((role) => SAAS_ADMIN_ROLES.has(role));
}

export function resolveLandingRoute(user?: AuthUser | null) {
  if (!user) return "/login";
  return canAccessSaas(user) ? "/saas" : "/dashboard";
}
