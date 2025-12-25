import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { Movement, MovementReasonConfig } from "@/types/operations";

interface MovementFormProps {
  onCreated?: (movement: Movement) => void;
}

export function MovementForm({ onCreated }: MovementFormProps) {
  const { post, get } = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const tenantParam = tenantId ? `?tenantId=${tenantId}` : "";
  const [loading, setLoading] = useState(false);
  const [reasons, setReasons] = useState<MovementReasonConfig[]>([]);
  const [form, setForm] = useState({
    productId: "",
    quantity: 1,
    fromLocation: "",
    toLocation: "",
    reasonCode: "",
    notes: "",
    type: "MANUAL" as Movement["type"]
  });

  useEffect(() => {
    get<MovementReasonConfig[]>("/config/movement-reasons")
      .then((items) => {
        const active = items.filter((reason) => reason.isActive);
        setReasons(active);
        const defaultReason = active.find((reason) => reason.isDefault);
        if (defaultReason) {
          setForm((prev) => ({ ...prev, reasonCode: prev.reasonCode || defaultReason.code }));
        }
      })
      .catch(() => toast({ title: "No pudimos cargar los motivos", variant: "destructive" }));
  }, [get]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const movement = await post<Movement>("/movements", {
        ...form,
        notes: form.notes.trim() || undefined
      });
      toast({ title: "Movimiento creado", description: `Traslado de ${form.quantity} unidades` });
      onCreated?.(movement);
      router.push(`/movements/${movement.id ?? ""}${tenantParam}`);
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos crear el movimiento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card asChild>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CardHeader>
          <CardTitle>Nuevo movimiento interno</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sku">Producto (SKU)</Label>
            <Input
              id="sku"
              required
              placeholder="Ej: SKU-001"
              value={form.productId}
              onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              min={0.01}
              step={0.01}
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">Ubicación origen</Label>
            <Input
              id="from"
              placeholder="RECV-01-01"
              value={form.fromLocation}
              onChange={(e) => setForm((prev) => ({ ...prev, fromLocation: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">Ubicación destino</Label>
            <Input
              id="to"
              placeholder="STG-02-03"
              value={form.toLocation}
              onChange={(e) => setForm((prev) => ({ ...prev, toLocation: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Motivo</Label>
            <Select value={form.reasonCode} onValueChange={(value) => setForm((prev) => ({ ...prev, reasonCode: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.code}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!reasons.length && (
              <p className="text-xs text-muted-foreground">Configura motivos en Ajustes para habilitar la lista.</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              placeholder="Detalles adicionales del movimiento"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading || (!!reasons.length && !form.reasonCode)}>
            {loading ? "Guardando..." : "Crear movimiento"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
