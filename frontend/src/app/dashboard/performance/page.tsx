"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/analytics/KpiCard";
import { DashboardSection } from "@/components/analytics/DashboardSection";
import { MiniTrendChart } from "@/components/analytics/MiniTrendChart";
import { PerformanceRankingTable } from "@/components/analytics/PerformanceRankingTable";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { PerformanceKpis } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock3, Crosshair, Gauge, LineChart, Timer } from "lucide-react";

function formatNumber(value?: number) {
  if (value === undefined) return "0";
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

export default function PerformanceDashboardPage() {
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kpi-performance"],
    queryFn: () => get<PerformanceKpis>("/kpi/performance"),
    staleTime: 60_000
  });

  if (initializing || !allowed) return <LoadingSpinner message="Cargando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de performance</h1>
          <p className="text-sm text-muted-foreground">Productividad, tiempos y errores por operario.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Líneas/h promedio"
            value={formatNumber(data?.productivity.reduce((sum, row) => sum + row.linesPerHour, 0) / (data?.productivity.length || 1))}
            icon={LineChart}
          />
          <KpiCard
            title="Tareas/h promedio"
            value={formatNumber(data?.productivity.reduce((sum, row) => sum + row.tasksPerHour, 0) / (data?.productivity.length || 1))}
            icon={Gauge}
          />
          <KpiCard title="Errores" value={formatNumber(data?.errors.reduce((sum, e) => sum + e.count, 0))} icon={Crosshair} emphasis="danger" />
          <KpiCard
            title="Tiempo de pick"
            value={`${data?.times.pick ?? 0} s`}
            description="Promedio por línea"
            icon={Clock3}
            emphasis="success"
          />
        </div>

        <DashboardSection title="Productividad por usuario" description="Líneas/h y tareas/h">
          <Card>
            <CardHeader>
              <CardTitle>Curva de productividad</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSpinner message="Cargando curvas..." />
              ) : isError ? (
                <p className="text-sm text-destructive">No fue posible obtener la productividad.</p>
              ) : (
                <MiniTrendChart data={data?.productivity.map((p) => p.linesPerHour) ?? []} />
              )}
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {data?.productivity.map((p) => (
                  <div key={p.user} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{p.user}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.linesPerHour.toFixed(1)} l/h</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.tasksPerHour.toFixed(1)} tareas/h</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection title="Errores por tipo" description="Calidad operativa">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {data?.errors.map((err) => (
              <KpiCard
                key={err.type}
                title={err.type}
                value={formatNumber(err.count)}
                icon={Activity}
                emphasis={err.count > 0 ? "danger" : "success"}
              />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Ranking de operarios" description="Comparativo de productividad">
          <PerformanceRankingTable
            rows={
              data?.productivity.map((p) => ({
                user: p.user,
                tasksPerHour: p.tasksPerHour,
                linesPerHour: p.linesPerHour,
                errors: data?.errors.find((e) => e.type === `${p.user}-errors`)?.count ?? 0
              })) ?? []
            }
          />
        </DashboardSection>
      </div>
    </AppShell>
  );
}
