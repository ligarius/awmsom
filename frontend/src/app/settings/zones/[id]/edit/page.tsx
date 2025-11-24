"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { WarehouseSelect } from "@/components/settings/WarehouseSelect";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { usePermissions } from "@/hooks/usePermissions";
import type { Zone } from "@/types/wms";

const zoneTypes = ["RECEIVING", "STORAGE", "PICKING", "SHIPPING", "RETURNS"];

export default function EditZonePage() {
  const params = useParams();
  const router = useRouter();
  const { get, patch } = useApi();
  const { canWriteWmsConfig } = usePermissions();
  const [form, setForm] = useState<Zone | null>(null);

  useEffect(() => {
    if (!canWriteWmsConfig) return;
    get<Zone>(`/zones/${params?.id}`)
      .then(setForm)
      .catch(() => toast({ title: "No pudimos cargar la zona", variant: "destructive" }));
  }, [canWriteWmsConfig, get, params?.id]);

  const handleSubmit = async () => {
    if (!form) return;
    try {
      await patch(`/zones/${params?.id}`, form);
      toast({ title: "Zona actualizada" });
      router.push("/settings/zones");
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
            <CardDescription>No tienes permisos para editar zonas.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader title="Editar zona" backTo="/settings/zones" />
      <Card>
        <CardHeader>
          <CardTitle>Datos de la zona</CardTitle>
          <CardDescription>Actualiza la configuración.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Bodega</Label>
              <WarehouseSelect
                value={form?.warehouseId}
                onChange={(value) => setForm((prev) => (prev ? { ...prev, warehouseId: value } : prev))}
              />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form?.name ?? ""} onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form?.code ?? ""} onChange={(e) => setForm((prev) => (prev ? { ...prev, code: e.target.value } : prev))} />
            </div>
            <div>
              <Label>Tipo de zona</Label>
              <Select
                value={form?.zoneType}
                onValueChange={(value) => setForm((prev) => (prev ? { ...prev, zoneType: value as Zone["zoneType"] } : prev))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {zoneTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={form?.description ?? ""}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                checked={Boolean(form?.isActive)}
                onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, isActive: Boolean(checked) } : prev))}
              />
              <Label>Activa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/settings/zones")}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar</Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
