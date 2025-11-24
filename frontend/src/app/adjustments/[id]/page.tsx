"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Adjustment } from "@/types/operations";

export default function AdjustmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAdjustmentsWrite } = usePermissions();
  const { get } = useApi();
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);

  useEffect(() => {
    if (!canAdjustmentsWrite) {
      router.replace("/forbidden");
      return;
    }
    get<Adjustment>(`/adjustments/${id}`)
      .then((res) => setAdjustment(res))
      .catch(() => toast({ title: "No pudimos cargar el ajuste", variant: "destructive" }));
  }, [canAdjustmentsWrite, get, id, router]);

  if (!adjustment) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Cargando ajuste...</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Ajuste {adjustment.code}</h1>
        <p className="text-sm text-muted-foreground">{adjustment.type}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
          <CardDescription>Motivo y cantidades</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Producto</p>
            <p className="font-semibold">{adjustment.productName ?? adjustment.sku}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cantidad</p>
            <p className="font-semibold">{adjustment.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ubicación</p>
            <p className="font-semibold">{adjustment.locationCode ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lote</p>
            <p className="font-semibold">{adjustment.batch ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Motivo</p>
            <p className="font-semibold">{adjustment.reason}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuario</p>
            <p className="font-semibold">{adjustment.user ?? "sistema"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground">Comentario</p>
            <p className="font-semibold">{adjustment.comment ?? "-"}</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
