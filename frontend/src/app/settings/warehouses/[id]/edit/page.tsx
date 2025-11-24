"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import type { Warehouse } from "@/types/wms";

export default function EditWarehousePage() {
  const params = useParams();
  const router = useRouter();
  const { get, patch } = useApi();
  const { canWriteWmsConfig } = usePermissions();
  const [form, setForm] = useState<Warehouse | null>(null);

  useEffect(() => {
    if (!canWriteWmsConfig) return;
    get<Warehouse>(`/warehouses/${params?.id}`)
      .then(setForm)
      .catch(() => toast({ title: "No pudimos cargar la bodega", variant: "destructive" }));
  }, [canWriteWmsConfig, get, params?.id]);

  const handleChange = (key: string, value: unknown) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSubmit = async () => {
    if (!form) return;
    try {
      await patch(`/warehouses/${params?.id}`, form);
      toast({ title: "Bodega actualizada" });
      router.push(`/settings/warehouses/${params?.id}`);
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
            <CardDescription>No tienes permisos para editar bodegas.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader title="Editar bodega" backTo={`/settings/warehouses/${params?.id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Datos de la bodega</CardTitle>
          <CardDescription>Actualiza la información.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input value={form?.name ?? ""} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form?.code ?? ""} onChange={(e) => handleChange("code", e.target.value)} />
            </div>
            <div>
              <Label>País</Label>
              <Input value={form?.country ?? ""} onChange={(e) => handleChange("country", e.target.value)} />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={form?.city ?? ""} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input value={form?.address ?? ""} onChange={(e) => handleChange("address", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox checked={Boolean(form?.isActive)} onCheckedChange={(checked) => handleChange("isActive", Boolean(checked))} />
              <Label>Activa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(`/settings/warehouses/${params?.id}`)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar</Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
