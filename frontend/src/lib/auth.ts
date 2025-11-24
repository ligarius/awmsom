import { AUTH_TOKEN_COOKIE } from "@/lib/constants";

/**
 * Client-side accessor for the JWT token. We deliberately keep the value in
 * localStorage for axios to inject the Authorization header, while a server
 * action in /app/api/auth/login will also set an HttpOnly cookie so SSR and
 * middleware can validate the session securely.
 */
export function getAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(AUTH_TOKEN_COOKIE) ?? undefined;
}

/**
 * Utility used by the axios interceptor when the backend responds with
 * 401/403. It clears local state and sends the user back to /login.
 */
export function handleAuthError() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_COOKIE);
  window.location.href = "/login";
}

export {}; // keep file as a module
