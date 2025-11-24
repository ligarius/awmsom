"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/AuthProvider";

export function usePermissionGuard(required: string | string[]) {
  const router = useRouter();
  const { user, initializing } = useAuthContext();

  const allowed = useMemo(() => {
    if (!user) return false;
    const permissions = user.permissions ?? [];
    const requiredList = Array.isArray(required) ? required : [required];
    return requiredList.every((permission) => permissions.includes(permission));
  }, [required, user]);

  useEffect(() => {
    if (!initializing && !allowed) {
      router.replace("/forbidden");
    }
  }, [allowed, initializing, router]);

  return { allowed, initializing };
}
