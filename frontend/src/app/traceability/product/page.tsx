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
import type { TraceabilityProductResponse } from "@/types/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageSearch } from "lucide-react";

export default function TraceabilityProductPage() {
  const searchParams = useSearchParams();
  const initialSku = searchParams.get("sku") ?? "";
  const [sku, setSku] = useState(initialSku);
  const [querySku, setQuerySku] = useState(initialSku);
  const { allowed, initializing } = usePermissionGuard("TRACEABILITY_READ");
  const { get } = useApi();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["traceability-product", querySku],
    queryFn: () => get<TraceabilityProductResponse>(`/traceability/product/${querySku}`),
    enabled: !!querySku,
    staleTime: 60_000
  });

  const timelines = data?.movements.map((m) => ({
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
            <h1 className="text-2xl font-bold">Trazabilidad por producto</h1>
            <p className="text-sm text-muted-foreground">Movimientos, lotes y documentos relacionados.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <Button onClick={() => setQuerySku(sku)} disabled={!sku}>
              <PackageSearch className="mr-2 h-4 w-4" /> Buscar
            </Button>
          </div>
        </div>

        {!querySku ? (
          <Card>
            <CardHeader>
              <CardTitle>Ingresa un SKU para iniciar</CardTitle>
            </CardHeader>
          </Card>
        ) : isLoading ? (
          <LoadingSpinner message="Buscando movimientos del SKU..." />
        ) : isError ? (
          <p className="text-sm text-destructive">No pudimos recuperar la trazabilidad de este SKU.</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <TraceabilityCard
                title="Resumen"
                badges={data.batches}
                items={[
                  { label: "SKU", value: data.sku },
                  { label: "Lotes", value: data.batches.length },
                  { label: "Ubicaciones", value: data.locations.length },
                  { label: "Movimientos", value: data.movements.length }
                ]}
              />
              <TraceabilityCard
                title="Inbound relacionado"
                subtitle="Recepciones"
                items={data.inbound.map((i) => ({ label: i.document, value: new Date(i.date).toLocaleString() }))}
              />
              <TraceabilityCard
                title="Outbound relacionado"
                subtitle="Órdenes"
                items={data.outbound.map((o) => ({ label: o.document, value: new Date(o.date).toLocaleString() }))}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Timeline de movimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <TraceabilityTimeline items={timelines} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ubicaciones actuales</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {data.locations.map((loc) => (
                  <div key={`${loc.location}-${loc.batch ?? "n/a"}`} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{loc.location}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{loc.batch ?? "Sin lote"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{loc.quantity} uds</p>
                  </div>
                ))}
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
