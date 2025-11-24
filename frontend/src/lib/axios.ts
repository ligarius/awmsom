import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { getAuthToken, handleAuthError } from "@/lib/auth";

/**
 * Centralized axios instance that injects JWT tokens and captures
 * 401/403 errors to keep the UX consistent across modules.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      handleAuthError();
    }
    return Promise.reject(error);
  }
);
