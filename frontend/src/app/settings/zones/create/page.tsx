"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const zoneTypes = [
  { value: "RECEIVING", label: "Recepción" },
  { value: "STORAGE", label: "Almacenaje" },
  { value: "PICKING", label: "Picking" },
  { value: "SHIPPING", label: "Despacho" },
  { value: "RETURNS", label: "Devoluciones" }
];

export default function CreateZonePage() {
  const router = useRouter();
  const { post } = useApi();
  const { canWriteWmsConfig } = usePermissions();
  const [form, setForm] = useState({
    warehouseId: "",
    name: "",
    code: "",
    zoneType: "STORAGE",
    description: "",
    isActive: true
  });

  const handleSubmit = async () => {
    try {
      await post("/zones", form);
      toast({ title: "Zona creada" });
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
            <CardDescription>No tienes permisos para crear zonas.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader title="Crear zona" backTo="/settings/zones" />
      <Card>
        <CardHeader>
          <CardTitle>Datos de la zona</CardTitle>
          <CardDescription>Asigna la zona a una bodega y define su uso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Bodega</Label>
              <WarehouseSelect value={form.warehouseId} onChange={(value) => setForm((prev) => ({ ...prev, warehouseId: value }))} />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo de zona</Label>
              <Select
                value={form.zoneType}
                onValueChange={(value) => setForm((prev) => ({ ...prev, zoneType: value as typeof form.zoneType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {zoneTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: Boolean(checked) }))} />
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
