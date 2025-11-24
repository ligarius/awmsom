import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { handleAuthError } from "@/lib/auth";

/**
 * Centralized axios instance configured to send HttpOnly cookies and
 * capture 401/403 errors to keep the UX consistent across modules.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
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
