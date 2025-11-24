import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { Movement } from "@/types/operations";

interface MovementFormProps {
  onCreated?: (movement: Movement) => void;
}

export function MovementForm({ onCreated }: MovementFormProps) {
  const { post } = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    quantity: 1,
    fromLocation: "",
    toLocation: "",
    reason: "",
    type: "MANUAL" as Movement["type"]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const movement = await post<Movement>("/movements", form);
      toast({ title: "Movimiento creado", description: `Traslado de ${form.quantity} unidades` });
      onCreated?.(movement);
      router.push(`/movements/${movement.id ?? ""}`);
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
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              placeholder="Reubicación, reabastecimiento, etc"
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear movimiento"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
