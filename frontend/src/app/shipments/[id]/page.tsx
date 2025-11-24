"use client";

import { useEffect } from "react";
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
    queryFn: () => get<Shipment>(`/shipments/${id}`),
    enabled: canShipmentsRead
  });

  const shipMutation = useMutation({
    mutationFn: () => post(`/shipments/${id}/ship`),
    onSuccess: () => {
      toast({ title: "Despacho confirmado" });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      router.push("/shipments");
    },
    onError: () => toast({ title: "No pudimos confirmar", variant: "destructive" })
  });

  if (!canShipmentsRead) return null;

  return (
    <AppShell>
      {shipmentQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{shipmentQuery.data.code}</h1>
              <p className="text-sm text-muted-foreground">Cliente {shipmentQuery.data.client}</p>
            </div>
            {canShipmentsExecute && shipmentQuery.data.status !== "SHIPPED" && (
              <Button onClick={() => shipMutation.mutate()} disabled={shipMutation.isLoading}>
                Confirmar despacho
              </Button>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <ShipmentCard shipment={shipmentQuery.data} />
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Productos enviados</CardTitle>
                <CardDescription>Resumen final de unidades.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {shipmentQuery.data.lines.map((line) => (
                  <div key={line.productSku} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{line.productSku}</p>
                        <p className="text-sm text-muted-foreground">{line.productName}</p>
                      </div>
                      <p className="text-sm font-semibold">{line.quantity} {line.uom ?? "uds"}</p>
                    </div>
                  </div>
                ))}
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
