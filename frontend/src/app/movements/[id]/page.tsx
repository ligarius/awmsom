"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Movement } from "@/types/operations";

export default function MovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canMovementsWrite } = usePermissions();
  const { get } = useApi();
  const [movement, setMovement] = useState<Movement | null>(null);

  useEffect(() => {
    if (!canMovementsWrite) {
      router.replace("/forbidden");
      return;
    }
    get<Movement>(`/movements/${id}`)
      .then((res) => setMovement(res))
      .catch(() => toast({ title: "No pudimos cargar el movimiento", variant: "destructive" }));
  }, [canMovementsWrite, get, id, router]);

  if (!movement) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Cargando movimiento...</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Movimiento {movement.id}</h1>
        <p className="text-sm text-muted-foreground">Tipo {movement.type}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle exacto</CardTitle>
          <CardDescription>Auditoría y estados</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Producto</p>
            <p className="font-semibold">{movement.productName ?? movement.sku}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cantidad</p>
            <p className="font-semibold">{movement.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Origen</p>
            <p className="font-semibold">{movement.fromLocation ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Destino</p>
            <p className="font-semibold">{movement.toLocation ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuario</p>
            <p className="font-semibold">{movement.user ?? "sistema"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="font-semibold">{movement.createdAt ?? "-"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground">Motivo</p>
            <p className="font-semibold">{movement.reason ?? "No informado"}</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
