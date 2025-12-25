"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { TraceabilityCard } from "@/components/analytics/TraceabilityCard";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { TraceabilityMovementResponse } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TraceabilityMovementPage() {
  const params = useParams<{ id: string }>();
  const movementId = params.id;
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["traceability-movement", movementId],
    queryFn: () => get<TraceabilityMovementResponse>(`/traceability/movement/${movementId}`),
    enabled: !!movementId,
    staleTime: 60_000
  });

  if (initializing || !allowed) return <LoadingSpinner message="Validando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Movimiento {movementId}</h1>

        {isLoading ? (
          <LoadingSpinner message="Cargando movimiento..." />
        ) : isError ? (
          <p className="text-sm text-destructive">No pudimos recuperar el movimiento.</p>
        ) : data ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TraceabilityCard
              title="Detalle"
              badges={[data.impact]}
              items={[
                { label: "Desde", value: data.from },
                { label: "Hacia", value: data.to },
                { label: "Usuario", value: data.user },
                { label: "SKU", value: data.sku },
                { label: "Lote", value: data.batch ?? "N/A" }
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>Inventario impactado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Cantidad</span>
                  <span className="font-semibold">{data.quantity} uds</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Fecha</span>
                  <span>{new Date(data.timestamp).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
