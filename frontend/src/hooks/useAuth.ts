"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user.store";
import type { AuthCredentials, AuthMfaRequiredResponse, AuthResponse, AuthUser } from "@/types/auth";
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
  const [mfaChallenge, setMfaChallenge] = useState<AuthMfaRequiredResponse | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<Omit<AuthCredentials, "challengeId" | "mfaCode" | "factorId"> | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [lastTenantId, setLastTenantId] = useState<string | null>(null);

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
        const payload: AuthCredentials = {
          ...credentials,
          tenantId: credentials.tenantId || lastTenantId || ""
        };

        if (!credentials.mfaCode) {
          setPendingCredentials({ email: payload.email, password: payload.password, tenantId: payload.tenantId });
        }

        if (payload.tenantId) {
          setLastTenantId(payload.tenantId);
        }

        if (mfaChallenge) {
          payload.challengeId = credentials.challengeId ?? mfaChallenge.challengeId;
          payload.factorId = credentials.factorId ?? mfaChallenge.factor?.id;
        }

        if (mfaCode && payload.challengeId === mfaChallenge?.challengeId && !payload.mfaCode) {
          payload.mfaCode = mfaCode;
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        });
        const data = (await response.json()) as AuthResponse & { message?: string };

        if (!response.ok) {
          throw new Error(data?.message ?? "Credenciales inválidas o servicio no disponible");
        }

        if (data.mfaRequired) {
          setMfaChallenge(data);
          setMfaCode("");
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
        setMfaCode("");
        setPendingCredentials(null);
        if (data.user.tenantId) {
          setLastTenantId(data.user.tenantId);
        }
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
    [lastTenantId, mfaChallenge, mfaCode, router, setLastTenantId, setMfaChallenge, setUser]
  );

  const submitMfaCode = useCallback(
    async (code: string, options?: { challengeId?: string; factorId?: string }) => {
      if (!mfaChallenge && !options?.challengeId) {
        throw new Error("No hay un desafío MFA activo");
      }

      if (!pendingCredentials) {
        throw new Error("Faltan las credenciales base para completar el reto MFA");
      }

      setMfaCode(code);

      return login({
        ...pendingCredentials,
        challengeId: options?.challengeId ?? mfaChallenge?.challengeId ?? "",
        mfaCode: code,
        factorId: options?.factorId ?? mfaChallenge?.factor?.id
      });
    },
    [login, mfaChallenge, pendingCredentials]
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
    mfaCode,
    login,
    submitMfaCode,
    setMfaCode,
    logout,
    getUser
  };
}
