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
import type { HandlingUnit } from "@/types/operations";
import { PackingSummary } from "@/components/operations/PackingSummary";

export default function PackingDetailPage() {
  const { shipmentId: handlingUnitId } = useParams<{ shipmentId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPackingExecute } = usePermissions();
  const { get, post } = useApi();
  const [outboundOrderId, setOutboundOrderId] = useState("");

  useEffect(() => {
    if (!canPackingExecute) router.replace("/forbidden");
  }, [canPackingExecute, router]);

  const handlingUnitQuery = useQuery({
    queryKey: ["handling-units", handlingUnitId],
    queryFn: () => get<HandlingUnit>(`/outbound/handling-units/${handlingUnitId}`),
    enabled: canPackingExecute,
    onSuccess: (data) => {
      if (data.lines.length && !outboundOrderId) {
        setOutboundOrderId(data.lines[0].outboundOrderId);
      }
    }
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      post(`/outbound/handling-units/${handlingUnitId}/items`, {
        outboundOrderId,
        items:
          handlingUnitQuery.data?.lines.map((line) => ({
            outboundOrderLineId: line.outboundOrderLineId,
            productId: line.productId,
            batchId: line.batchId ?? undefined,
            quantity: line.quantity,
            uom: line.uom,
          })) ?? []
      }),
    onSuccess: () => {
      toast({ title: "Packing completado" });
      queryClient.invalidateQueries({ queryKey: ["handling-units"] });
      router.push("/packing");
    },
    onError: () => toast({ title: "No pudimos cerrar el packing", variant: "destructive" })
  });

  if (!canPackingExecute) return null;

  return (
    <AppShell>
      {handlingUnitQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Packing {handlingUnitQuery.data.code}</h1>
              <p className="text-sm text-muted-foreground">Handling unit {handlingUnitQuery.data.handlingUnitType}</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Volver
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <PackingSummary lines={handlingUnitQuery.data.lines} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Validación</CardTitle>
                <CardDescription>Confirma el registro de ítems en la HU.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Orden outbound</Label>
                  <Input
                    value={outboundOrderId}
                    onChange={(e) => setOutboundOrderId(e.target.value)}
                    placeholder="Selecciona o escribe el outbound"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={completeMutation.isLoading || !outboundOrderId || !handlingUnitQuery.data?.lines.length}
                  onClick={() => completeMutation.mutate()}
                >
                  {completeMutation.isLoading ? "Confirmando..." : "Confirmar packing"}
                </Button>
                <p className="text-xs text-muted-foreground">Etiqueta: se generará automáticamente (placeholder).</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {!handlingUnitQuery.data && handlingUnitQuery.isLoading && (
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
