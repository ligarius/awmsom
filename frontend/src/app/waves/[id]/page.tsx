"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { Wave } from "@/types/operations";
import { WaveStatusBadge } from "@/components/operations/WaveStatusBadge";
import { OutboundStatusBadge } from "@/components/operations/OutboundStatusBadge";

export default function WaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { get, post } = useApi();
  const { canWavePlan, canWaveRelease } = usePermissions();

  useEffect(() => {
    if (!canWavePlan && !canWaveRelease) router.replace("/forbidden");
  }, [canWavePlan, canWaveRelease, router]);

  const waveQuery = useQuery({
    queryKey: ["waves", id],
    queryFn: () => get<Wave>(`/waves/${id}`),
    enabled: canWavePlan || canWaveRelease
  });

  const releaseMutation = useMutation({
    mutationFn: () => post(`/waves/${id}/release`),
    onSuccess: () => {
      toast({ title: "Wave liberada" });
      queryClient.invalidateQueries({ queryKey: ["waves"] });
      queryClient.invalidateQueries({ queryKey: ["waves", id] });
    },
    onError: () => toast({ title: "No pudimos liberar la wave", variant: "destructive" })
  });

  if (!canWavePlan && !canWaveRelease) return null;

  return (
    <AppShell>
      {waveQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{waveQuery.data.code}</h1>
              <p className="text-sm text-muted-foreground">Bodega {waveQuery.data.warehouseName ?? "-"}</p>
            </div>
            <div className="flex items-center gap-2">
              <WaveStatusBadge status={waveQuery.data.status} />
              {canWavePlan && (
                <Button variant="outline" asChild>
                  <Link href={`/waves/${id}/plan`}>Planificar wave</Link>
                </Button>
              )}
              {canWaveRelease && (
                <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isLoading}>
                  Liberar wave
                </Button>
              )}
            </div>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Estado actual y asignación de la wave.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Órdenes</p>
                <p className="font-semibold">{waveQuery.data.ordersCount ?? waveQuery.data.orders.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SKUs</p>
                <p className="font-semibold">{waveQuery.data.skuCount ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Picker</p>
                <p className="font-semibold">{waveQuery.data.pickerName ?? "No asignado"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Órdenes incluidas</CardTitle>
              <CardDescription>Detalle de órdenes y su estado individual.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {waveQuery.data.orders.map((order) => (
                <div key={order.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/outbound/${order.id}`} className="font-semibold text-primary">
                        {order.code}
                      </Link>
                      <p className="text-xs text-muted-foreground">Cliente {order.client}</p>
                    </div>
                    <OutboundStatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Líneas</p>
                      <p className="font-semibold">{order.lines.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Compromiso</p>
                      <p className="font-semibold">{order.commitmentDate ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Picker</p>
                      <p className="font-semibold">{order.pickerName ?? "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!waveQuery.data.orders.length && <p className="text-sm text-muted-foreground">Sin órdenes asignadas.</p>}
            </CardContent>
          </Card>
        </>
      )}
      {!waveQuery.data && !waveQuery.isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Wave no encontrada</CardTitle>
            <CardDescription>El identificador no corresponde a una wave activa.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </AppShell>
  );
}
