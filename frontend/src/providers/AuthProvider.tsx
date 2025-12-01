"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthMfaChallenge, AuthUser } from "@/types/auth";

interface AuthContextValue {
  user?: AuthUser;
  initializing: boolean;
  isAuthenticated: boolean;
  mfaRequired: boolean;
  mfaChallenge: AuthMfaChallenge | null;
  login: ReturnType<typeof useAuth>["login"];
  logout: ReturnType<typeof useAuth>["logout"];
  getUser: ReturnType<typeof useAuth>["getUser"];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  }
  return context;
}
