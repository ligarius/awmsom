"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { usePermissions } from "@/hooks/usePermissions";

export default function CreateWarehousePage() {
  const router = useRouter();
  const { post } = useApi();
  const { canWriteWmsConfig } = usePermissions();
  const [form, setForm] = useState({
    name: "",
    code: "",
    country: "",
    city: "",
    address: "",
    isActive: true
  });

  const handleChange = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    try {
      await post("/warehouses", form);
      toast({ title: "Bodega creada" });
      router.push("/settings/warehouses");
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  if (!canWriteWmsConfig) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>No tienes permisos para crear bodegas.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader title="Crear bodega" backTo="/settings/warehouses" />
      <Card>
        <CardHeader>
          <CardTitle>Datos de la bodega</CardTitle>
          <CardDescription>Completa la información obligatoria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => handleChange("code", e.target.value)} />
            </div>
            <div>
              <Label>País</Label>
              <Input value={form.country} onChange={(e) => handleChange("country", e.target.value)} />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox checked={form.isActive} onCheckedChange={(checked) => handleChange("isActive", Boolean(checked))} />
              <Label>Activa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/settings/warehouses")}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar</Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
