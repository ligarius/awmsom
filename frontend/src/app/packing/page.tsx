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
import type { HandlingUnit } from "@/types/operations";

export default function PackingListPage() {
  const router = useRouter();
  const { canPackingExecute } = usePermissions();
  const { get } = useApi();

  useEffect(() => {
    if (!canPackingExecute) router.replace("/forbidden");
  }, [canPackingExecute, router]);

  const handlingUnitsQuery = useQuery({
    queryKey: ["handling-units"],
    queryFn: () => get<HandlingUnit[]>("/outbound/handling-units"),
    enabled: canPackingExecute,
    onError: () => toast({ title: "No pudimos cargar las handling units", variant: "destructive" })
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
          <CardTitle>Handling units</CardTitle>
          <CardDescription>Selecciona una handling unit para validar el empaque.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {handlingUnitsQuery.data?.map((hu) => (
            <div key={hu.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{hu.code}</p>
                  <p className="text-xs text-muted-foreground">Tipo {hu.handlingUnitType}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/packing/${hu.id}`}>Empacar</Link>
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Líneas</p>
                  <p className="font-semibold">{hu.lines.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Órdenes outbound</p>
                  <p className="font-semibold">{new Set(hu.lines.map((line) => line.outboundOrderId)).size}</p>
                </div>
              </div>
            </div>
          ))}
          {!handlingUnitsQuery.data?.length && <p className="text-sm text-muted-foreground">No hay handling units para empaquetar.</p>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
