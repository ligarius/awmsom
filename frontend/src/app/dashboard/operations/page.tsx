"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/analytics/KpiCard";
import { MiniTrendChart } from "@/components/analytics/MiniTrendChart";
import { DashboardSection } from "@/components/analytics/DashboardSection";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { OperationsKpis } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Box, ClipboardList, Clock, PackageCheck, ScanLine, Truck } from "lucide-react";

function formatNumber(value?: number) {
  if (value === undefined) return "0";
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

export default function OperationsDashboardPage() {
  const { allowed, initializing } = usePermissionGuard("DASHBOARD_READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kpi-operations"],
    queryFn: () => get<OperationsKpis>("/kpi/operations"),
    staleTime: 60_000
  });

  if (initializing || !allowed) return <LoadingSpinner message="Validando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard operacional</h1>
          <p className="text-sm text-muted-foreground">Flujo en vivo de recepciones, órdenes, waves y replenishments.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard title="Recepciones del día" value={formatNumber(data?.inboundToday)} icon={Truck} description="Inbound" />
          <KpiCard title="Órdenes liberadas" value={formatNumber(data?.releasedOrders)} icon={ClipboardList} />
          <KpiCard title="En picking" value={formatNumber(data?.pickingOrders)} icon={ScanLine} />
          <KpiCard title="Completadas" value={formatNumber(data?.completedOrders)} icon={PackageCheck} />
          <KpiCard title="Waves activas" value={formatNumber(data?.activeWaves)} icon={Activity} />
          <KpiCard title="Replenishments" value={formatNumber(data?.replenishmentsPending)} icon={Box} />
        </div>

        <DashboardSection title="Rendimiento de picking" description="Líneas por hora">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia horaria</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSpinner message="Cargando rendimiento..." />
              ) : isError ? (
                <p className="text-sm text-destructive">No pudimos obtener el rendimiento.</p>
              ) : (
                <MiniTrendChart data={data?.pickingPerformance.map((p) => p.lines) ?? []} />
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {data?.pickingPerformance.map((p) => (
                  <span key={p.hour} className="rounded-full bg-muted px-2 py-1">
                    {p.hour}: {p.lines} líneas
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection title="Movimientos por tipo" description="Inbound, outbound y ajustes">
          <div className="grid gap-3 md:grid-cols-3">
            {data?.movementsByType.map((m) => (
              <KpiCard
                key={m.type}
                title={m.type}
                value={formatNumber(m.count)}
                icon={m.type === "inbound" ? Truck : m.type === "outbound" ? Clock : Activity}
                helper="Movimientos procesados"
              />
            ))}
          </div>
        </DashboardSection>
      </div>
    </AppShell>
  );
}
