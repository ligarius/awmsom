"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { PackingShipment } from "@/types/operations";

export default function PackingListPage() {
  const router = useRouter();
  const { canPackingExecute } = usePermissions();
  const { get } = useApi();

  useEffect(() => {
    if (!canPackingExecute) router.replace("/forbidden");
  }, [canPackingExecute, router]);

  const packingQuery = useQuery({
    queryKey: ["packing"],
    queryFn: () => get<PackingShipment[]>("/packing"),
    enabled: canPackingExecute,
    onError: () => toast({ title: "No pudimos cargar packing", variant: "destructive" })
  });

  if (!canPackingExecute) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Packing</h1>
          <p className="text-sm text-muted-foreground">Shipments pendientes de empaque.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <CardDescription>Selecciona un shipment para validar el empaque.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {packingQuery.data?.map((shipment) => (
            <div key={shipment.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{shipment.code ?? shipment.id}</p>
                  <p className="text-xs text-muted-foreground">Cliente {shipment.client}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/packing/${shipment.id}`}>Empacar</Link>
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Líneas</p>
                  <p className="font-semibold">{shipment.lines.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Wave</p>
                  <p className="font-semibold">{shipment.waveId ?? "-"}</p>
                </div>
              </div>
            </div>
          ))}
          {!packingQuery.data?.length && <p className="text-sm text-muted-foreground">No hay shipments en packing.</p>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
