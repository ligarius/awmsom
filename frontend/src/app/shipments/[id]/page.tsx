"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { Shipment } from "@/types/operations";
import { ShipmentCard } from "@/components/operations/ShipmentCard";
import { PackingSummary } from "@/components/operations/PackingSummary";

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canShipmentsRead, canShipmentsExecute } = usePermissions();
  const { get, post } = useApi();

  useEffect(() => {
    if (!canShipmentsRead) router.replace("/forbidden");
  }, [canShipmentsRead, router]);

  const shipmentQuery = useQuery({
    queryKey: ["shipments", id],
    queryFn: () => get<Shipment>(`/outbound/shipments/${id}`),
    enabled: canShipmentsRead
  });

  const shipMutation = useMutation({
    mutationFn: () => post(`/outbound/shipments/${id}/dispatch`, {}),
    onSuccess: () => {
      toast({ title: "Despacho confirmado" });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      router.push("/shipments");
    },
    onError: () => toast({ title: "No pudimos confirmar", variant: "destructive" })
  });

  const canDispatch = useMemo(() => {
    if (!shipmentQuery.data) return false;

    const hasHandlingUnits = (shipmentQuery.data.shipmentHandlingUnits?.length ?? 0) > 0;
    const isDispatchable = ["PLANNED", "LOADING"].includes(shipmentQuery.data.status);

    return canShipmentsExecute && hasHandlingUnits && isDispatchable;
  }, [canShipmentsExecute, shipmentQuery.data]);

  if (!canShipmentsRead) return null;

  return (
    <AppShell>
      {shipmentQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Shipment {shipmentQuery.data.id}</h1>
              <p className="text-sm text-muted-foreground">Estado {shipmentQuery.data.status}</p>
            </div>
            {canDispatch && (
              <Button onClick={() => shipMutation.mutate()} disabled={shipMutation.isLoading}>
                Confirmar despacho
              </Button>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <ShipmentCard shipment={shipmentQuery.data} />
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Handling units asignadas</CardTitle>
                <CardDescription>Detalle de unidades y órdenes outbound.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shipmentQuery.data.shipmentHandlingUnits?.length ? (
                  shipmentQuery.data.shipmentHandlingUnits.map((link) => (
                    <div key={link.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold">HU {link.handlingUnit?.code ?? link.handlingUnitId}</p>
                          <p className="text-muted-foreground">{link.handlingUnit?.handlingUnitType ?? "-"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Outbound</p>
                          <p className="font-semibold">{link.outboundOrder?.code ?? link.outboundOrderId}</p>
                        </div>
                      </div>
                      {link.handlingUnit?.lines?.length ? (
                        <div className="mt-3">
                          <PackingSummary lines={link.handlingUnit.lines} />
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin handling units asignadas.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {!shipmentQuery.data && shipmentQuery.isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Cargando shipment</CardTitle>
            <CardDescription>Obteniendo detalle.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </AppShell>
  );
}
