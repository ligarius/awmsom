"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/FormSection";
import { RolePermissionMatrix } from "@/components/RolePermissionMatrix";
import { useApi } from "@/hooks/useApi";
import type { Permission } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";

export default function CreateRolePage() {
  const router = useRouter();
  const { get, post } = useApi();
  const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get<Permission[]>("/permissions").then(setPermissions).catch(() => toast({ title: "No pudimos cargar permisos" }));
  }, [get]);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await post("/roles", form);
      toast({ title: "Rol creado" });
      router.push("/settings/roles");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos crear el rol";
      toast({ title: "Error al crear el rol", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Crear rol</CardTitle>
          <CardDescription>Define un rol y asigna permisos granulares.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Información del rol">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </FormSection>
          <FormSection title="Permisos" description="Selecciona permisos por categoría">
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
            <Button onClick={onSubmit} disabled={loading}>
              Crear rol
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
