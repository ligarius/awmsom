"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/analytics/KpiCard";
import { MiniTrendChart } from "@/components/analytics/MiniTrendChart";
import { StockHeatMap } from "@/components/analytics/StockHeatMap";
import { DashboardSection } from "@/components/analytics/DashboardSection";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { ExecutiveKpis } from "@/types/analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Flame, Gauge, PieChart, TrendingUp } from "lucide-react";

function formatPercent(value?: number) {
  if (value === undefined) return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value?: number) {
  if (value === undefined) return "0";
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

export default function ExecutiveDashboardPage() {
  const { allowed, initializing } = usePermissionGuard("DASHBOARD_READ");
  const { get } = useApi();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kpi-executive"],
    queryFn: () => get<ExecutiveKpis>("/kpi/executive"),
    staleTime: 1000 * 60
  });

  const rotationData = data?.rotationBySku ?? [];
  const demandSeries = data?.demandByDay.map((d) => d.units) ?? [];
  const heatmap = useMemo(() => data?.heatmap ?? [], [data]);

  if (initializing || !allowed) return <LoadingSpinner message="Cargando permisos..." />;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard ejecutivo</h1>
            <p className="text-sm text-muted-foreground">Visibilidad integral de desempeño OTIF, inventario y demanda.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted"
          >
            <TrendingUp className="h-4 w-4" /> Refrescar KPIs
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard title="OTIF" value={formatPercent(data?.otif)} description="On Time In Full" icon={Activity} />
          <KpiCard title="Fill Rate" value={formatPercent(data?.fillRate)} description="Órdenes completas" icon={Gauge} />
          <KpiCard
            title="Nivel de servicio"
            value={formatPercent(data?.serviceLevel)}
            description="SLA de despacho"
            icon={PieChart}
            emphasis="success"
          />
          <KpiCard
            title="Inventario (unidades)"
            value={formatNumber(data?.inventoryUnits)}
            description="Stock total"
            icon={BarChart3}
          />
          <KpiCard
            title="Inventario (valor)"
            value={`$${formatNumber(data?.inventoryValue)}`}
            description="Valor aproximado"
            icon={Flame}
          />
        </div>

        <DashboardSection
          title="Demanda y rotación"
          description="Proyección diaria y rotación por SKU"
          action={<Badge variant="outline">Top 5 SKUs por consumo</Badge>}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolución de demanda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <LoadingSpinner message="Calculando demanda..." />
                ) : isError ? (
                  <p className="text-sm text-destructive">No fue posible obtener la demanda.</p>
                ) : (
                  <MiniTrendChart data={demandSeries} />
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {data?.demandByDay.map((d) => (
                    <span key={d.date} className="rounded-full bg-muted px-2 py-1">
                      {new Date(d.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}: {d.units} uds
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top consumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data?.topConsumption.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <span>{item.sku}</span>
                    <span className="font-semibold">{formatNumber(item.units)} uds</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </DashboardSection>

        <DashboardSection title="Rotación ABC" description="Participación por categoría y SKU">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Clasificación ABC</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div
                  className="h-40 w-40 rounded-full"
                  style={{
                    background: `conic-gradient(#22c55e 0 ${data ? data.abc.a * 360 : 0}deg, #facc15 0 ${
                      data ? (data.abc.a + data.abc.b) * 360 : 0
                    }deg, #f97316 0 360deg)`
                  }}
                />
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" /> A</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-400" /> B</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-orange-500" /> C</span>
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Rotación por SKU</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rotationData.map((item) => (
                  <div key={item.sku} className="space-y-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.sku}</span>
                      <span className="text-muted-foreground">{item.turns} giros</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.turns * 10, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </DashboardSection>

        <DashboardSection title="Actividad por hora" description="Heatmap de operación">
          <StockHeatMap
            title="Heatmap"
            columns={6}
            zones={(heatmap.length ? heatmap : Array.from({ length: 12 }).map((_, idx) => ({
              label: `${idx * 2}:00`,
              utilization: Math.round(Math.random() * 100)
            }))).map((item) => ({ label: `${item.hour}:00`, utilization: Math.round(item.value * 100) }))}
          />
        </DashboardSection>

        <DashboardSection title="SKUs críticos" description="Alertas tempranas de stock">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data?.topCritical.map((item) => (
              <KpiCard
                key={item.sku}
                title={item.sku}
                value={`${formatNumber(item.stock)} uds`}
                description="Stock disponible"
                trend={{ label: "Alerta", value: "Bajo stock", positive: false }}
                icon={Flame}
                emphasis="warning"
              />
            ))}
          </div>
        </DashboardSection>
      </div>
    </AppShell>
  );
}
