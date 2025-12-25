import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { handleAuthError } from "@/lib/auth";
import { useUserStore } from "@/store/user.store";

/**
 * Centralized axios instance configured to send HttpOnly cookies and
 * capture 401/403 errors to keep the UX consistent across modules.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }
  const params = new URLSearchParams(window.location.search);
  const tenantIdFromUrl = params.get("tenantId");
  const pathname = window.location.pathname;
  const storageKey = "awms_active_tenant";
  const token = useUserStore.getState().accessToken;
  if (tenantIdFromUrl) {
    localStorage.setItem(storageKey, tenantIdFromUrl);
  } else if (pathname.startsWith("/saas")) {
    localStorage.removeItem(storageKey);
  }
  const storedTenantId = localStorage.getItem(storageKey);
  const tenantId = tenantIdFromUrl ?? (pathname.startsWith("/saas") ? null : storedTenantId);
  if (tenantId) {
    config.headers = config.headers ?? {};
    if (!("x-tenant-id" in config.headers)) {
      config.headers["x-tenant-id"] = tenantId;
    }
  }
  if (token) {
    config.headers = config.headers ?? {};
    if (!("Authorization" in config.headers)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      await handleAuthError();
    }
    return Promise.reject(error);
  }
);
