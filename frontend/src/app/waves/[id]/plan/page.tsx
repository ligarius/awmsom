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
import type { PickingPathPlan, Wave } from "@/types/operations";
import { WavePlanRouteTable } from "@/components/operations/WavePlanRouteTable";

export default function WavePlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canWavePlan, canWaveRelease } = usePermissions();
  const { get, post } = useApi();

  useEffect(() => {
    if (!canWavePlan) router.replace("/forbidden");
  }, [canWavePlan, router]);

  const waveQuery = useQuery({
    queryKey: ["waves", id, "detail"],
    queryFn: () => get<Wave>(`/waves/${id}`),
    enabled: canWavePlan
  });

  const planQuery = useQuery({
    queryKey: ["waves", id, "picking-path"],
    queryFn: () => get<PickingPathPlan>(`/waves/${id}/picking-path`),
    enabled: canWavePlan
  });

  const confirmPlan = useMutation({
    mutationFn: () => post(`/waves/${id}/plan`),
    onSuccess: () => {
      toast({ title: "Plan confirmado" });
      queryClient.invalidateQueries({ queryKey: ["waves", id] });
      queryClient.invalidateQueries({ queryKey: ["waves", id, "picking-path"] });
    },
    onError: () => toast({ title: "No pudimos confirmar el plan", variant: "destructive" })
  });

  const releaseWave = useMutation({
    mutationFn: () => post(`/waves/${id}/release`),
    onSuccess: () => {
      toast({ title: "Wave liberada para picking" });
      queryClient.invalidateQueries({ queryKey: ["waves"] });
      router.push("/waves");
    },
    onError: () => toast({ title: "No pudimos liberar la wave", variant: "destructive" })
  });

  if (!canWavePlan) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planificación de ruta</h1>
          <p className="text-sm text-muted-foreground">Secuencia óptima de ubicaciones por wave.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      {waveQuery.data && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{waveQuery.data.code}</CardTitle>
            <CardDescription>Estado {waveQuery.data.status}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Órdenes</p>
              <p className="font-semibold">{waveQuery.data.orders.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Picker</p>
              <p className="font-semibold">{waveQuery.data.pickerName ?? "No asignado"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bodega</p>
              <p className="font-semibold">{waveQuery.data.warehouseName ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {planQuery.data && (
        <Card className="mt-4">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Ruta sugerida</CardTitle>
              <CardDescription>
                Distancia {planQuery.data.totalDistance} m • Tiempo estimado {planQuery.data.estimatedTimeMinutes} min
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => confirmPlan.mutate()} disabled={confirmPlan.isLoading}>
                Confirmar plan
              </Button>
              {canWaveRelease && (
                <Button onClick={() => releaseWave.mutate()} disabled={releaseWave.isLoading}>
                  Liberar para picking
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <WavePlanRouteTable plan={planQuery.data} />
          </CardContent>
        </Card>
      )}
      {!planQuery.data && planQuery.isLoading && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Calculando ruta...</CardTitle>
            <CardDescription>Obteniendo secuencia optimizada.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </AppShell>
  );
}
