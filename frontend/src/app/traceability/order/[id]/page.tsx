"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { TraceabilityCard } from "@/components/analytics/TraceabilityCard";
import { TraceabilityTimeline } from "@/components/analytics/TraceabilityTimeline";
import { MovementTraceList } from "@/components/analytics/MovementTraceList";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { TraceabilityOrderResponse } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TraceabilityOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["traceability-order", orderId],
    queryFn: () => get<TraceabilityOrderResponse>(`/traceability/order/${orderId}`),
    enabled: !!orderId,
    staleTime: 60_000
  });

  const timeline = data?.movements.map((m) => ({
    id: m.id,
    title: `${m.from} → ${m.to}`,
    description: `${m.quantity} uds ${m.sku}`,
    timestamp: m.timestamp,
    status: "info" as const,
    metadata: m.impact
  })) ?? [];

  if (initializing || !allowed) return <LoadingSpinner message="Validando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Orden {orderId}</h1>

        {isLoading ? (
          <LoadingSpinner message="Cargando orden..." />
        ) : isError ? (
          <p className="text-sm text-destructive">No pudimos recuperar la orden.</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <TraceabilityCard
                title="Detalles"
                badges={[data.status, data.customer]}
                items={data.lines.map((line) => ({
                  label: `${line.sku} ${line.batch ?? ""}`,
                  value: `${line.qty} uds`
                }))}
              />
              <TraceabilityCard
                title="Picking tasks"
                items={data.pickingTasks.map((task) => ({ label: `${task.id} · ${task.user}`, value: task.status }))}
              />
              <TraceabilityCard
                title="Packing & envíos"
                items={[
                  data.packing ? { label: "Packing", value: `${data.packing.user} · ${new Date(data.packing.timestamp).toLocaleString()}` } : { label: "Packing", value: "Pendiente" },
                  ...data.shipments.map((s) => ({ label: `Shipment ${s.id}`, value: `${s.carrier} · ${new Date(s.timestamp).toLocaleString()}` }))
                ]}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Movimientos asociados</CardTitle>
              </CardHeader>
              <CardContent>
                <TraceabilityTimeline items={timeline} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle de movimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <MovementTraceList items={data.movements} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
