"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { OutboundOrder } from "@/types/operations";
import { WaveOrderSelector } from "@/components/operations/WaveOrderSelector";

export default function WaveCreatePage() {
  const router = useRouter();
  const { canWaveCreate } = usePermissions();
  const { get, post } = useApi();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [picker, setPicker] = useState("");
  const [warehouse, setWarehouse] = useState("");

  useEffect(() => {
    if (!canWaveCreate) router.replace("/forbidden");
  }, [canWaveCreate, router]);

  const ordersQuery = useQuery({
    queryKey: ["outbound", "released"],
    queryFn: () => get<OutboundOrder[]>("/outbound", { status: "RELEASED" }),
    enabled: canWaveCreate
  });

  const handleSubmit = async () => {
    try {
      await post("/waves", { orderIds: selectedOrders, pickerId: picker, warehouseId: warehouse });
      toast({ title: "Wave creada" });
      router.push("/waves");
    } catch (error) {
      toast({ title: "No pudimos crear la wave", variant: "destructive" });
    }
  };

  if (!canWaveCreate) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Crear wave picking</h1>
          <p className="text-sm text-muted-foreground">Agrupa órdenes y asigna picker/bodega.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Selección de órdenes</CardTitle>
          <CardDescription>Escoge las órdenes liberadas para incluir en la wave.</CardDescription>
        </CardHeader>
        <CardContent>
          <WaveOrderSelector orders={ordersQuery.data ?? []} selectedIds={selectedOrders} onChange={setSelectedOrders} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Asignación operativa</CardTitle>
          <CardDescription>Define quién pickea y desde qué bodega.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Picker (usuario)</Label>
            <Input value={picker} onChange={(e) => setPicker(e.target.value)} placeholder="usuario" />
          </div>
          <div>
            <Label>Bodega</Label>
            <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="bodega" />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/waves")}>Cancelar</Button>
        <Button disabled={!selectedOrders.length} onClick={handleSubmit}>
          Crear wave
        </Button>
      </div>
    </AppShell>
  );
}
