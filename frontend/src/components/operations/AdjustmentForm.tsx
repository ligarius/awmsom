import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useApi } from "@/hooks/useApi";
import type { Adjustment } from "@/types/operations";

const reasons = ["DETERIORO", "INVENTARIO", "SOBRANTE", "PÉRDIDA"];

interface AdjustmentFormProps {
  onCreated?: (adjustment: Adjustment) => void;
}

export function AdjustmentForm({ onCreated }: AdjustmentFormProps) {
  const { post } = useApi();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    quantity: 0,
    type: "AUMENTO" as Adjustment["type"],
    batch: "",
    location: "",
    reason: reasons[0],
    comment: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const adjustment = await post<Adjustment>("/adjustments", form);
      toast({ title: "Ajuste registrado", description: `${form.type === "AUMENTO" ? "+" : "-"}${form.quantity} unidades` });
      onCreated?.(adjustment);
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos registrar el ajuste", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card asChild>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CardHeader>
          <CardTitle>Nuevo ajuste</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product">Producto</Label>
            <Input
              id="product"
              required
              placeholder="SKU"
              value={form.productId}
              onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              required
              min={0.01}
              step={0.01}
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as Adjustment["type"] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUMENTO">Aumento</SelectItem>
                <SelectItem value="DISMINUCION">Disminución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch">Lote (opcional)</Label>
            <Input id="batch" value={form.batch} onChange={(e) => setForm((prev) => ({ ...prev, batch: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              placeholder="PAS-01-02"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={form.reason} onValueChange={(value) => setForm((prev) => ({ ...prev, reason: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="comment">Comentario</Label>
            <Input
              id="comment"
              placeholder="Detalles del ajuste"
              value={form.comment}
              onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Registrar ajuste"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
