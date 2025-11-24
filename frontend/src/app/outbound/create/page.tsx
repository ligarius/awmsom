"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

interface OrderLineForm {
  productId: string;
  quantity: number;
  uom: string;
}

export default function OutboundCreatePage() {
  const router = useRouter();
  const { canOutboundCreate, canOutboundRead } = usePermissions();
  const { post } = useApi();
  const [externalRef, setExternalRef] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [requestedShipDate, setRequestedShipDate] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [lines, setLines] = useState<OrderLineForm[]>([{ productId: "", quantity: 1, uom: "UN" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!canOutboundCreate && !canOutboundRead) {
      router.replace("/forbidden");
    }
  }, [canOutboundCreate, canOutboundRead, router]);

  const addLine = () => setLines((prev) => [...prev, { productId: "", quantity: 1, uom: "UN" }]);
  const updateLine = (index: number, key: keyof OrderLineForm, value: string | number) => {
    setLines((prev) => prev.map((line, idx) => (idx === index ? { ...line, [key]: value } : line)));
  };
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, idx) => idx !== index));
  const isFormInvalid =
    !warehouse || lines.some((line) => !line.productId || !line.quantity || !line.uom || Number(line.quantity) <= 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await post("/outbound/orders", {
        warehouseId: warehouse,
        externalRef: externalRef || undefined,
        customerRef: customerRef || undefined,
        requestedShipDate: requestedShipDate || undefined,
        lines: lines.map((line) => ({
          productId: line.productId,
          requestedQty: Number(line.quantity),
          uom: line.uom
        }))
      });
      toast({ title: "Orden creada" });
      router.push("/outbound");
    } catch (error) {
      toast({ title: "No pudimos crear la orden", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canOutboundCreate && !canOutboundRead) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Crear orden outbound</h1>
          <p className="text-sm text-muted-foreground">Define referencias, fecha compromiso y líneas a despachar.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
          <CardDescription>Información básica requerida para liberar la orden.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Referencia externa</Label>
            <Input value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="Externo" />
          </div>
          <div>
            <Label>Referencia cliente</Label>
            <Input value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} placeholder="Cliente" />
          </div>
          <div>
            <Label>Fecha compromiso</Label>
            <Input type="date" value={requestedShipDate} onChange={(e) => setRequestedShipDate(e.target.value)} />
          </div>
          <div>
            <Label>Bodega</Label>
            <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Bodega" />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Líneas de producto</CardTitle>
            <CardDescription>Define producto, cantidad y unidad de medida.</CardDescription>
          </div>
          <Button variant="outline" onClick={addLine} size="sm">
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>ID de producto</Label>
                <Input
                  value={line.productId}
                  onChange={(e) => updateLine(index, "productId", e.target.value)}
                  placeholder="Producto"
                />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, "quantity", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>UoM</Label>
                <Input value={line.uom} onChange={(e) => updateLine(index, "uom", e.target.value)} />
              </div>
              {lines.length > 1 && (
                <div className="md:col-span-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/outbound")}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || isFormInvalid}>
          {isSubmitting ? "Creando..." : "Crear orden"}
        </Button>
      </div>
    </AppShell>
  );
}
