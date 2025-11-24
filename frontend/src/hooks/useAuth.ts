"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user.store";
import type { AuthCredentials, AuthResponse, AuthUser } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

/**
 * Hook that centralizes auth operations for pages and components.
 * It delegates the heavy lifting to Next.js API routes so we can keep
 * the session in HttpOnly cookies without persisting any token in
 * localStorage.
 */
export function useAuth() {
  const router = useRouter();
  const { user, setUser, clear } = useUserStore();
  const [initializing, setInitializing] = useState(true);

  const getUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) throw new Error("No se pudo recuperar la sesión");
      const data = (await response.json()) as { user: AuthUser };
      setUser(data.user);
    } catch (error) {
      clear();
    } finally {
      setInitializing(false);
    }
  }, [clear, setUser]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error("Credenciales inválidas o servicio no disponible");
        }
        const data = (await response.json()) as AuthResponse;
        setUser(data.user);
        toast({
          title: "Bienvenido",
          description: `${data.user.fullName} listo para operar`
        });
        router.replace("/dashboard");
      } catch (error) {
        toast({
          title: "No pudimos iniciar sesión",
          description: (error as Error).message,
          variant: "destructive"
        });
        throw error;
      }
    },
    [router, setUser]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clear();
    router.replace("/login");
  }, [clear, router]);

  return {
    user,
    initializing,
    isAuthenticated: Boolean(user),
    login,
    logout,
    getUser
  };
}
