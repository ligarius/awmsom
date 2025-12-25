"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/FormSection";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateUserPage() {
  const router = useRouter();
  const { post } = useApi();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: tenantId ? "ADMIN" : "OPERATOR"
  });
  const [loading, setLoading] = useState(false);
  const roleOptions = ["ADMIN", "SUPERVISOR", "OPERATOR"];

  const onSubmit = async () => {
    setLoading(true);
    try {
      const endpoint = tenantId ? `/saas/tenants/${tenantId}/users` : "/users";
      await post(endpoint, form);
      toast({ title: "Usuario creado" });
      router.push(tenantId ? `/saas/tenants/${tenantId}/users` : "/settings/users");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos crear el usuario";
      toast({ title: "Error al crear el usuario", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Crear usuario</CardTitle>
          <CardDescription>Define credenciales iniciales y rol asignado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Información básica">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Nombre</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="password">Contraseña temporal</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>
        </CardContent>
        <CardFooter className="justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              Crear usuario
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
