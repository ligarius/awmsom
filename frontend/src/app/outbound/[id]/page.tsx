"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { OutboundStatusBadge } from "@/components/operations/OutboundStatusBadge";
import { usePermissions } from "@/hooks/usePermissions";
import type { OutboundOrder } from "@/types/operations";

export default function OutboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canOutboundRead, canOutboundRelease } = usePermissions();
  const { get, post } = useApi();

  useEffect(() => {
    if (!canOutboundRead) {
      router.replace("/forbidden");
    }
  }, [canOutboundRead, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["outbound", id],
    queryFn: () => get<OutboundOrder>(`/outbound/orders/${id}`),
    enabled: canOutboundRead
  });

  const releaseMutation = useMutation({
    mutationFn: () => post(`/outbound/orders/${id}/release`),
    onSuccess: () => {
      toast({ title: "Orden liberada" });
      queryClient.invalidateQueries({ queryKey: ["outbound"] });
      queryClient.invalidateQueries({ queryKey: ["outbound", id] });
    },
    onError: () => toast({ title: "No se pudo liberar la orden", variant: "destructive" })
  });

  if (!canOutboundRead) return null;

  return (
    <AppShell>
      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Cargando orden</CardTitle>
            <CardDescription>Preparando detalles de outbound</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{data.externalRef ?? data.customerRef ?? data.id}</h1>
              <p className="text-sm text-muted-foreground">
                Cliente {data.customerRef ?? "-"} • Bodega {data.warehouseName ?? data.warehouseId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OutboundStatusBadge status={data.status} />
              <Button variant="outline" asChild>
                <Link href="/picking/tasks">Ver picking</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/waves/create">Asignar a Wave</Link>
              </Button>
              {canOutboundRelease && data.status === "DRAFT" && (
                <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isLoading}>
                  Liberar orden
                </Button>
              )}
            </div>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Datos generales</CardTitle>
              <CardDescription>Información para planificación y operaciones.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Fecha compromiso</p>
                <p className="font-semibold">{data.requestedShipDate ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Picker asignado</p>
                <p className="font-semibold">{data.pickerName ?? "No asignado"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wave</p>
                <p className="font-semibold">{data.waveId ?? "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Líneas pendientes</CardTitle>
              <CardDescription>SKU pendientes de pickeo</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {data.lines
                .filter((line) => (line.pickedQty ?? 0) < line.requestedQty)
                .map((line) => (
                  <div key={line.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{line.productSku ?? line.productId}</p>
                        <p className="text-sm text-muted-foreground">{line.productName}</p>
                      </div>
                      <Badge variant="outline">Pendiente</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pedido</p>
                        <p className="font-semibold">{line.requestedQty}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pickeado</p>
                        <p className="font-semibold">{line.pickedQty ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ubicación</p>
                        <p className="font-semibold">{line.locationCode ?? "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {!data.lines.filter((line) => (line.pickedQty ?? 0) < line.requestedQty).length && (
                <p className="text-sm text-muted-foreground">No hay líneas pendientes.</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Líneas pickeadas</CardTitle>
              <CardDescription>Detalle de lo ya preparado</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {data.lines
                .filter((line) => (line.pickedQty ?? 0) >= line.requestedQty)
                .map((line) => (
                  <div key={line.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{line.productSku ?? line.productId}</p>
                        <p className="text-sm text-muted-foreground">{line.productName}</p>
                      </div>
                      <Badge variant="secondary">Completo</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pedido</p>
                        <p className="font-semibold">{line.requestedQty}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pickeado</p>
                        <p className="font-semibold">{line.pickedQty ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ubicación</p>
                        <p className="font-semibold">{line.locationCode ?? "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {!data.lines.filter((line) => (line.pickedQty ?? 0) >= line.requestedQty).length && (
                <p className="text-sm text-muted-foreground">Sin líneas completadas todavía.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
