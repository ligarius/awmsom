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
  return Boolean(store.user?.permissions?.includes(permission));
}

export function hasRole(role: string) {
  if (!role) return false;
  const store = useUserStore.getState();
  return store.user?.role === role;
}

export {}; // keep file as a module
