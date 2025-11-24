"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { ProductInventoryDetail } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { Progress } from "@/components/ui/progress";

export default function InventoryDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const { canInventoryRead } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<ProductInventoryDetail | null>(null);

  useEffect(() => {
    if (!canInventoryRead) {
      router.replace("/forbidden");
      return;
    }
    get<ProductInventoryDetail>(`/inventory/product/${productId}`)
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar el detalle", variant: "destructive" }));
  }, [canInventoryRead, get, productId, router]);

  if (!data) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Cargando producto...</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{data.sku}</h1>
        <p className="text-sm text-muted-foreground">{data.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución por ubicación</CardTitle>
          <CardDescription>Ayuda a detectar concentración de inventario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.byLocation.map((loc) => (
            <div key={loc.location}>
              <div className="flex items-center justify-between text-sm">
                <span>{loc.location}</span>
                <span className="font-semibold">{loc.quantity}</span>
              </div>
              <Progress value={Math.min(100, loc.quantity)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lotes</CardTitle>
            <CardDescription>Cantidades por lote</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.batches.map((batch) => (
              <div key={batch.batch} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <p className="font-semibold">{batch.batch}</p>
                  <p className="text-muted-foreground">{batch.expiresAt ?? "Sin vencimiento"}</p>
                </div>
                <span className="font-semibold">{batch.quantity}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos recientes</CardTitle>
            <CardDescription>Últimos 20 movimientos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentMovements.map((mov) => (
              <div key={mov.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{mov.type}</span>
                  <span>{mov.quantity}</span>
                </div>
                <p className="text-muted-foreground">
                  {mov.fromLocation ?? "-"} → {mov.toLocation ?? "-"} • {mov.user ?? "sistema"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
