"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user.store";
import type { AuthCredentials, AuthMfaChallenge, AuthResponse, AuthUser } from "@/types/auth";
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
  const [mfaChallenge, setMfaChallenge] = useState<AuthMfaChallenge | null>(null);

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
        const data = (await response.json()) as AuthResponse & { message?: string };

        if (!response.ok) {
          throw new Error(data?.message ?? "Credenciales inválidas o servicio no disponible");
        }

        if (data.mfaRequired) {
          setMfaChallenge(data);
          toast({
            title: "Se requiere verificación MFA",
            description: "Ingresa el código enviado para completar el acceso"
          });
          return data;
        }

        if (!data.user) {
          throw new Error("Respuesta de autenticación incompleta");
        }

        setMfaChallenge(null);
        setUser(data.user);
        toast({
          title: "Bienvenido",
          description: `${data.user.fullName} listo para operar`
        });
        router.replace("/dashboard");
        return data;
      } catch (error) {
        toast({
          title: "No pudimos iniciar sesión",
          description: (error as Error).message,
          variant: "destructive"
        });
        throw error;
      }
    },
    [router, setMfaChallenge, setUser]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setMfaChallenge(null);
    clear();
    router.replace("/login");
  }, [clear, router, setMfaChallenge]);

  return {
    user,
    initializing,
    isAuthenticated: Boolean(user),
    mfaRequired: Boolean(mfaChallenge),
    mfaChallenge,
    login,
    logout,
    getUser
  };
}
