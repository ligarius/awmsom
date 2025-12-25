"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useAuthContext } from "@/providers/AuthProvider";
import { resolveLandingRoute } from "@/lib/navigation";

export default function Home() {
  const router = useRouter();
  const { user, initializing } = useAuthContext();

  useEffect(() => {
    if (initializing) return;
    router.replace(resolveLandingRoute(user));
  }, [initializing, router, user]);

  return <LoadingSpinner message="Cargando acceso..." />;
}
