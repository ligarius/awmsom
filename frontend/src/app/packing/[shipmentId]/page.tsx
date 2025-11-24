"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PackingShipment } from "@/types/operations";
import { PackingSummary } from "@/components/operations/PackingSummary";

export default function PackingDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPackingExecute } = usePermissions();
  const { get, post } = useApi();
  const [hu, setHu] = useState("");

  useEffect(() => {
    if (!canPackingExecute) router.replace("/forbidden");
  }, [canPackingExecute, router]);

  const shipmentQuery = useQuery({
    queryKey: ["packing", shipmentId],
    queryFn: () => get<PackingShipment>(`/packing/${shipmentId}`),
    enabled: canPackingExecute
  });

  const completeMutation = useMutation({
    mutationFn: () => post(`/packing/${shipmentId}/complete`, { handlingUnit: hu }),
    onSuccess: () => {
      toast({ title: "Packing completado" });
      queryClient.invalidateQueries({ queryKey: ["packing"] });
      router.push("/shipments");
    },
    onError: () => toast({ title: "No pudimos cerrar el packing", variant: "destructive" })
  });

  if (!canPackingExecute) return null;

  return (
    <AppShell>
      {shipmentQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Packing {shipmentQuery.data.code ?? shipmentQuery.data.id}</h1>
              <p className="text-sm text-muted-foreground">Cliente {shipmentQuery.data.client}</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Volver
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <PackingSummary lines={shipmentQuery.data.lines} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Validación</CardTitle>
                <CardDescription>Registra HU/caja y confirma.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>HU / Caja</Label>
                  <Input value={hu} onChange={(e) => setHu(e.target.value)} placeholder="Escanea o escribe" />
                </div>
                <Button className="w-full" disabled={completeMutation.isLoading} onClick={() => completeMutation.mutate()}>
                  {completeMutation.isLoading ? "Confirmando..." : "Confirmar packing"}
                </Button>
                <p className="text-xs text-muted-foreground">Etiqueta: se generará automáticamente (placeholder).</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {!shipmentQuery.data && shipmentQuery.isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Cargando shipment</CardTitle>
            <CardDescription>Obteniendo líneas pickeadas.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </AppShell>
  );
}
