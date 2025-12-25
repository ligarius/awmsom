"use client";

import { api } from "@/lib/axios";
import { useCallback } from "react";
import type { AxiosRequestConfig } from "axios";

/**
 * Thin axios wrapper to keep request helpers colocated with components.
 * The hook is intentionally small; domain-specific hooks should live next
 * to each module when developed in future sprints.
 */
export function useApi() {
  const get = useCallback(
    async <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) => {
      const { data } = await api.get<T>(url, { params, ...config });
      return data;
    },
    []
  );

  const post = useCallback(
    async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
      const { data } = await api.post<T>(url, body, config);
      return data;
    },
    []
  );

  const patch = useCallback(
    async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
      const { data } = await api.patch<T>(url, body, config);
      return data;
    },
    []
  );

  const put = useCallback(
    async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
      const { data } = await api.put<T>(url, body, config);
      return data;
    },
    []
  );

  return { get, post, patch, put };
}
