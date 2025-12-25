import { useUserStore } from "@/store/user.store";

/**
 * Client-side helpers for auth-related flows. Authentication now relies on
 * HttpOnly cookies instead of exposing the token in localStorage.
 */
export async function handleAuthError() {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch (error) {
    console.error("No se pudo cerrar la sesión", error);
  }

  const store = useUserStore.getState();
  store.clear();
  window.location.href = "/login";
}

export function hasPermission(permission: string) {
  if (!permission) return false;
  const store = useUserStore.getState();
  const roles = store.user?.roles ?? (store.user?.role ? [store.user.role] : []);
  if (roles.some((role) => role === "OWNER" || role === "PLATFORM_ADMIN" || role === "ADMIN")) {
    return true;
  }
  const normalizedTarget = normalizePermission(permission);
  const permissions = store.user?.permissions ?? [];
  return permissions.some((perm) => normalizePermission(perm) === normalizedTarget);
}

export function hasRole(role: string) {
  if (!role) return false;
  const store = useUserStore.getState();
  const roles = store.user?.roles ?? (store.user?.role ? [store.user.role] : []);
  return roles.includes(role);
}

function normalizePermission(permission: string) {
  return permission.trim().replace(/_/g, ":").toUpperCase();
}

export {}; // keep file as a module
