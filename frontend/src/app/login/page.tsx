"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/providers/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, submitMfaCode, mfaChallenge, mfaRequired, mfaCode, setMfaCode, startOAuth } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [factorId, setFactorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const isMfaStep = useMemo(() => Boolean(mfaChallenge || mfaRequired), [mfaChallenge, mfaRequired]);

  useEffect(() => {
    if (mfaChallenge?.challengeId) {
      setChallengeId(mfaChallenge.challengeId);
    }
    if (mfaChallenge?.factor?.id) {
      setFactorId(mfaChallenge.factor.id);
    }
  }, [mfaChallenge]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (isMfaStep) {
        await submitMfaCode(mfaCode, {
          challengeId: challengeId || mfaChallenge?.challengeId,
          factorId: factorId || mfaChallenge?.factor?.id
        });
        return;
      }

      const response = await login({
        email,
        password,
        tenantId,
        factorId: factorId || undefined
      });

      if (response?.mfaRequired && response.challengeId) {
        setChallengeId(response.challengeId);
        toast({
          title: "Código MFA requerido",
          description: "Ingresa el código recibido y vuelve a enviar el formulario"
        });
      }
    } catch (error) {
      toast({
        title: "Error al iniciar sesión",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async () => {
    if (!tenantId) {
      toast({
        title: "Tenant requerido",
        description: "Ingresa el tenant para redirigir al proveedor OAuth",
        variant: "destructive"
      });
      return;
    }

    setOauthLoading(true);
    try {
      const redirectUrl = await startOAuth({ provider: "oidc-demo", tenantId });
      window.location.assign(redirectUrl);
    } catch (error) {
      toast({
        title: "No pudimos iniciar sesión con OAuth",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>AWMS | Acceso</CardTitle>
          <CardDescription>
            Ingresa con tu cuenta corporativa. El token JWT se almacena en cookie HttpOnly y en memoria para permitir SSR y
            peticiones a la API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@awms.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant</Label>
              <Input
                id="tenantId"
                type="text"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="ID del tenant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {isMfaStep && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Código MFA</Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Introduce el código temporal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challengeId">Challenge ID</Label>
                  <Input
                    id="challengeId"
                    type="text"
                    required
                    value={challengeId}
                    onChange={(e) => setChallengeId(e.target.value)}
                    placeholder="challenge-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factorId">Factor ID preferido</Label>
                  <Input
                    id="factorId"
                    type="text"
                    value={factorId}
                    onChange={(e) => setFactorId(e.target.value)}
                    placeholder="factor-id"
                  />
                </div>
                <p className="text-sm text-amber-600">
                  Verifica tu identidad con el código enviado. Challenge ID: {challengeId}
                  {mfaChallenge?.factor?.channelHint ? ` (${mfaChallenge.factor.channelHint})` : ""}.
                </p>
              </>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ingresar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={oauthLoading}
              onClick={handleOAuthLogin}
            >
              {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar con OAuth2"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Consejo: aquí se conectará el endpoint real POST /auth/login. En los sprints posteriores añadiremos recuperación de
              contraseña, MFA y selección de tenant.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
