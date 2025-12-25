"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/FormSection";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { TenantUser } from "@/types/saas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const { get, patch, post } = useApi();
  const [form, setForm] = useState<{ fullName: string; role: string; password?: string; status?: string } | null>(null);
  const roleOptions = ["ADMIN", "SUPERVISOR", "OPERATOR"];

  useEffect(() => {
    get<TenantUser>(`/users/${params.id}`)
      .then((user) => setForm({ fullName: user.fullName, role: user.role, status: user.status }))
      .catch(() => toast({ title: "No pudimos cargar el usuario", variant: "destructive" }));
  }, [get, params.id]);

  const onSubmit = async () => {
    if (!form) return;
    await patch(`/users/${params.id}`, form);
    toast({ title: "Usuario actualizado" });
    router.push(tenantId ? `/settings/users/${params.id}?tenantId=${tenantId}` : `/settings/users/${params.id}`);
  };

  const toggle = async () => {
    if (!form) return;
    const endpoint = form.status === "ACTIVE" ? `/users/${params.id}/deactivate` : `/users/${params.id}/activate`;
    await post(endpoint);
    toast({ title: "Estado actualizado" });
    setForm({ ...form, status: form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
  };

  if (!form) return null;

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Editar usuario</CardTitle>
          <CardDescription>Actualiza rol, nombre y estado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Perfil">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Nombre</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
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
              <div>
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password ?? ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="destructive" onClick={toggle}>
            {form.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={onSubmit}>Guardar</Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
