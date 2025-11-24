"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { nanoid } from "nanoid";

interface LineDraft {
  id: string;
  sku: string;
  expectedQty: number;
  uom: string;
}

export default function InboundCreatePage() {
  const router = useRouter();
  const { canInboundExecute } = usePermissions();
  const { post } = useApi();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ supplier: "", warehouseId: "", expectedDate: "" });
  const [lines, setLines] = useState<LineDraft[]>([{ id: nanoid(), sku: "", expectedQty: 0, uom: "UN" }]);

  if (!canInboundExecute) {
    router.replace("/forbidden");
  }

  const addLine = () => setLines((prev) => [...prev, { id: nanoid(), sku: "", expectedQty: 0, uom: "UN" }]);
  const updateLine = (id: string, changes: Partial<LineDraft>) =>
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...changes } : line)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((line) => line.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, lines: lines.map(({ id, ...rest }) => rest) };
      const inbound = await post<{ id: string }>("/inbound", payload);
      toast({ title: "Recepción creada", description: "Puedes iniciar la operación" });
      router.push(`/inbound/${inbound.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos crear la recepción", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Nueva recepción</h1>
            <p className="text-sm text-muted-foreground">Define proveedor y líneas a recibir</p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear recepción"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
            <CardDescription>Información básica del documento</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Input
                required
                value={form.supplier}
                onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="Proveedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Bodega</Label>
              <Input
                required
                value={form.warehouseId}
                onChange={(e) => setForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                placeholder="warehouse-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha esperada</Label>
              <Input
                type="date"
                value={form.expectedDate}
                onChange={(e) => setForm((prev) => ({ ...prev, expectedDate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Líneas</CardTitle>
            <CardDescription>SKU, cantidad esperada y UoM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    required
                    value={line.sku}
                    onChange={(e) => updateLine(line.id, { sku: e.target.value })}
                    placeholder="SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    value={line.expectedQty}
                    onChange={(e) => updateLine(line.id, { expectedQty: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UoM</Label>
                  <Input value={line.uom} onChange={(e) => updateLine(line.id, { uom: e.target.value })} />
                </div>
                <div className="flex items-end justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => updateLine(line.id, { expectedQty: line.expectedQty })}>
                    Revisar
                  </Button>
                  {lines.length > 1 && (
                    <Button type="button" variant="destructive" onClick={() => removeLine(line.id)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addLine}>
              Agregar línea
            </Button>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  );
}
