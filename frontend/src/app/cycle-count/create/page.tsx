"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";

export default function CycleCountCreatePage() {
  const router = useRouter();
  const { canCycleCountCreate } = usePermissions();
  const { post } = useApi();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ warehouseId: "", zones: "", locations: "", products: "", assignee: "" });

  useEffect(() => {
    if (!canCycleCountCreate) router.replace("/forbidden");
  }, [canCycleCountCreate, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        warehouseId: form.warehouseId,
        zones: form.zones.split(",").filter(Boolean),
        locations: form.locations.split(",").filter(Boolean),
        products: form.products.split(",").filter(Boolean),
        assignedTo: form.assignee
      };
      const doc = await post<{ id: string }>("/cycle-count", payload);
      toast({ title: "Tarea creada", description: "Asignada para conteo" });
      router.push(`/cycle-count/${doc.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos crear la tarea", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Nuevo ciclo de conteo</h1>
            <p className="text-sm text-muted-foreground">Define alcance y asigna operario</p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Parámetros</CardTitle>
            <CardDescription>Bodega, zonas y productos</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bodega</Label>
              <Input
                required
                value={form.warehouseId}
                onChange={(e) => setForm((p) => ({ ...p, warehouseId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Zonas (coma separadas)</Label>
              <Input value={form.zones} onChange={(e) => setForm((p) => ({ ...p, zones: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ubicaciones específicas</Label>
              <Input value={form.locations} onChange={(e) => setForm((p) => ({ ...p, locations: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Productos específicos</Label>
              <Input value={form.products} onChange={(e) => setForm((p) => ({ ...p, products: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Asignar a usuario</Label>
              <Input value={form.assignee} onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))} />
            </div>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  );
}
