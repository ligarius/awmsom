"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/FormSection";
import { RolePermissionMatrix } from "@/components/RolePermissionMatrix";
import { useApi } from "@/hooks/useApi";
import type { Permission, Role } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";

export default function EditRolePage() {
  const params = useParams();
  const router = useRouter();
  const { get, patch } = useApi();
  const [form, setForm] = useState<{ name: string; description?: string; permissions: string[] } | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    get<Role>(`/roles/${params.id}`)
      .then((role) => setForm({ name: role.name, description: role.description, permissions: role.permissions }))
      .catch(() => toast({ title: "No pudimos cargar el rol", variant: "destructive" }));
    get<Permission[]>("/permissions").then(setPermissions).catch(() => toast({ title: "No pudimos cargar permisos" }));
  }, [get, params.id]);

  const onSubmit = async () => {
    if (!form) return;
    await patch(`/roles/${params.id}`, form);
    toast({ title: "Rol actualizado" });
    router.push(`/settings/roles/${params.id}`);
  };

  if (!form) return null;

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Editar rol</CardTitle>
          <CardDescription>Actualiza nombre y permisos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Rol">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </FormSection>
          <FormSection title="Permisos" description="Ajusta los permisos asignados">
            <RolePermissionMatrix
              permissions={permissions}
              value={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
          </FormSection>
        </CardContent>
        <CardFooter className="justify-end">
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
