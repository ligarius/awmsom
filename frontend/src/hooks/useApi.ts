"use client";

import { api } from "@/lib/axios";
import { useCallback } from "react";

/**
 * Thin axios wrapper to keep request helpers colocated with components.
 * The hook is intentionally small; domain-specific hooks should live next
 * to each module when developed in future sprints.
 */
export function useApi() {
  const get = useCallback(
    async <T>(url: string, params?: Record<string, unknown>) => {
      const { data } = await api.get<T>(url, { params });
      return data;
    },
    []
  );

  const post = useCallback(
    async <T>(url: string, body?: unknown) => {
      const { data } = await api.post<T>(url, body);
      return data;
    },
    []
  );

  return { get, post };
}
