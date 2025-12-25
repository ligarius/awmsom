"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/AuthProvider";
import { hasPermission } from "@/lib/auth";

export function usePermissionGuard(required: string | string[]) {
  const router = useRouter();
  const { user, initializing } = useAuthContext();

  const allowed = useMemo(() => {
    if (!user) return false;
    const requiredList = Array.isArray(required) ? required : [required];
    return requiredList.every((permission) => hasPermission(permission));
  }, [required, user]);

  useEffect(() => {
    if (!initializing && !allowed) {
      router.replace("/forbidden");
    }
  }, [allowed, initializing, router]);

  return { allowed, initializing };
}
