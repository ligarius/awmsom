"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/analytics/KpiCard";
import { StockHeatMap } from "@/components/analytics/StockHeatMap";
import { DashboardSection } from "@/components/analytics/DashboardSection";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { InventoryKpis } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, ClipboardList, Layers, Shield, ShieldQuestion } from "lucide-react";

function formatNumber(value?: number) {
  if (value === undefined) return "0";
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

export default function InventoryDashboardPage() {
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kpi-inventory"],
    queryFn: () => get<InventoryKpis>("/kpi/inventory"),
    staleTime: 60_000
  });

  if (initializing || !allowed) return <LoadingSpinner message="Revisando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de inventario</h1>
          <p className="text-sm text-muted-foreground">Disponibilidad, compromisos y rotación por ubicación.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard title="SKUs activos" value={formatNumber(data?.activeSkus)} icon={Layers} />
          <KpiCard title="Stock total" value={formatNumber(data?.totalStock)} icon={Boxes} />
          <KpiCard title="Disponible" value={formatNumber(data?.availableStock)} icon={Shield} emphasis="success" />
          <KpiCard title="Comprometido" value={formatNumber(data?.committedStock)} icon={ClipboardList} emphasis="warning" />
          <KpiCard title="Dañado" value={formatNumber(data?.damagedStock)} icon={ShieldQuestion} emphasis="danger" />
        </div>

        <DashboardSection title="Mapa de inventario" description="Ocupación por zona y cluster">
          {isLoading ? (
            <LoadingSpinner message="Mapeando zonas..." />
          ) : isError ? (
            <p className="text-sm text-destructive">No pudimos obtener la ocupación por zona.</p>
          ) : (
            <StockHeatMap title="Zonas" zones={data?.zones ?? []} />
          )}
        </DashboardSection>

        <DashboardSection title="ABC product rotation" description="Rotación por categoría">
          <Card>
            <CardHeader>
              <CardTitle>SKU por categoría</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {data?.abcRotation.map((item) => (
                <div key={item.sku} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.sku}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{item.category}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.turns * 10, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.turns} giros</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection title="Ubicaciones más usadas" description="Ranking de slots con mayor movimiento">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {data?.topLocations.map((loc) => (
              <Card key={loc.location}>
                <CardHeader>
                  <CardTitle className="text-base">{loc.location}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(loc.occupancy, 100)}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">{loc.occupancy}% ocupación</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DashboardSection>
      </div>
    </AppShell>
  );
}
