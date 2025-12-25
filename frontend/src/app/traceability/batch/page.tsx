"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { TraceabilityTimeline } from "@/components/analytics/TraceabilityTimeline";
import { TraceabilityCard } from "@/components/analytics/TraceabilityCard";
import { MovementTraceList } from "@/components/analytics/MovementTraceList";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { TraceabilityBatchResponse } from "@/types/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanBarcode } from "lucide-react";

export default function TraceabilityBatchPage() {
  const searchParams = useSearchParams();
  const initialBatch = searchParams.get("batch") ?? "";
  const [batch, setBatch] = useState(initialBatch);
  const [queryBatch, setQueryBatch] = useState(initialBatch);
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["traceability-batch", queryBatch],
    queryFn: () => get<TraceabilityBatchResponse>(`/traceability/batch/${queryBatch}`),
    enabled: !!queryBatch,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trazabilidad por lote</h1>
            <p className="text-sm text-muted-foreground">Recepción original, movimientos y salidas.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Lote" value={batch} onChange={(e) => setBatch(e.target.value)} />
            <Button onClick={() => setQueryBatch(batch)} disabled={!batch}>
              <ScanBarcode className="mr-2 h-4 w-4" /> Buscar
            </Button>
          </div>
        </div>

        {!queryBatch ? (
          <Card>
            <CardHeader>
              <CardTitle>Ingresa un lote</CardTitle>
            </CardHeader>
          </Card>
        ) : isLoading ? (
          <LoadingSpinner message="Recuperando lote..." />
        ) : isError ? (
          <p className="text-sm text-destructive">No pudimos recuperar el lote.</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <TraceabilityCard
                title="Recepción"
                subtitle={data.reception.document}
                items={[
                  { label: "Fecha", value: new Date(data.reception.date).toLocaleString() },
                  { label: "Proveedor", value: data.reception.supplier ?? "N/A" },
                  { label: "Movimientos", value: data.movements.length }
                ]}
              />
              <TraceabilityCard
                title="Órdenes de salida"
                items={data.orders.map((o) => ({ label: `${o.id} · ${o.customer}`, value: new Date(o.date).toLocaleDateString() }))}
              />
              <TraceabilityCard title="Clientes" items={data.customers.map((c) => ({ label: c, value: "" }))} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Timeline de movimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <TraceabilityTimeline items={timeline} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Movimientos</CardTitle>
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
