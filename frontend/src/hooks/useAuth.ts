"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user.store";
import type {
  AuthCredentials,
  AuthMfaRequiredResponse,
  AuthResponse,
  AuthUser,
  OAuthStartPayload,
  OAuthStartResponse
} from "@/types/auth";
import { toast } from "@/components/ui/use-toast";
import { resolveLandingRoute } from "@/lib/navigation";

/**
 * Hook that centralizes auth operations for pages and components.
 * It delegates the heavy lifting to Next.js API routes so we can keep
 * the session in HttpOnly cookies without persisting any token in
 * localStorage.
 */
export function useAuth() {
  const router = useRouter();
  const { user, setUser, setAccessToken, clear } = useUserStore();
  const [initializing, setInitializing] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<AuthMfaRequiredResponse | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<Omit<AuthCredentials, "challengeId" | "mfaCode" | "factorId"> | null>(null);
  const [mfaCode, setMfaCode] = useState("");

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
        if (!credentials.mfaCode) {
          setPendingCredentials({ email: credentials.email, password: credentials.password });
        }

        if (mfaChallenge) {
          credentials.challengeId = credentials.challengeId ?? mfaChallenge.challengeId;
          credentials.factorId = credentials.factorId ?? mfaChallenge.factor?.id;
        }

        if (mfaCode && credentials.challengeId === mfaChallenge?.challengeId && !credentials.mfaCode) {
          credentials.mfaCode = mfaCode;
        }

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
        setAccessToken(data.accessToken);
        setUser(data.user);
        toast({
          title: "Bienvenido",
          description: `${data.user.fullName} listo para operar`
        });
        router.replace(resolveLandingRoute(data.user));
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
    [mfaChallenge, mfaCode, router, setAccessToken, setMfaChallenge, setUser]
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

  const startOAuth = useCallback(async ({ provider = "oidc-demo", tenantId, redirectUri }: OAuthStartPayload) => {
    if (!tenantId) {
      throw new Error("Tenant requerido para iniciar OAuth");
    }

    const response = await fetch("/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, tenantId, redirectUri }),
      credentials: "include"
    });

    const data = (await response.json()) as OAuthStartResponse;

    if (!response.ok || !data.redirectUrl) {
      throw new Error(data?.message ?? "No pudimos iniciar la redirección OAuth");
    }

    return data.redirectUrl;
  }, []);

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
    startOAuth,
    getUser
  };
}
