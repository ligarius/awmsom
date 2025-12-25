"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContentSection } from "@/components/layout/ContentSection";
import { EmptyState } from "@/components/layout/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
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
      <PageShell>
        <PageHeader title="Crear bodega" description="Gestiona datos maestros del WMS." backHref="/settings/warehouses" />
        <EmptyState
          title="Acceso denegado"
          description="No tienes permisos para crear bodegas."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Crear bodega" description="Completa la informacion obligatoria." backHref="/settings/warehouses" />
      <ContentSection title="Datos de la bodega" description="Campos obligatorios para el registro.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input value={form.code} onChange={(e) => handleChange("code", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pais</Label>
            <Input value={form.country} onChange={(e) => handleChange("country", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ciudad</Label>
            <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Direccion</Label>
            <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox checked={form.isActive} onCheckedChange={(checked) => handleChange("isActive", Boolean(checked))} />
            <Label>Activa</Label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/settings/warehouses")}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            Guardar
          </Button>
        </div>
      </ContentSection>
    </PageShell>
  );
}
