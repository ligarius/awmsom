"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/analytics/KpiCard";
import { DashboardSection } from "@/components/analytics/DashboardSection";
import { MiniTrendChart } from "@/components/analytics/MiniTrendChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useAuthContext } from "@/providers/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { canAccessSaas } from "@/lib/navigation";
import type { InventoryKpis, OperationsKpis } from "@/types/analytics";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Gauge,
  PackageCheck,
  ScanLine,
  Truck
} from "lucide-react";

function formatNumber(value?: number, decimals = 0) {
  if (value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimals }).format(value);
}

export default function DashboardPage() {
  const { user, initializing } = useAuthContext();
  const { allowed, initializing: permissionInit } = usePermissionGuard("REPORTS:READ");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const tenantParam = tenantId ? `?tenantId=${tenantId}` : "";
  const { get } = useApi();
  const { dateLabel, timeLabel } = useMemo(() => {
    const now = new Date();
    return {
      dateLabel: new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" }).format(now),
      timeLabel: new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(now)
    };
  }, []);

  useEffect(() => {
    if (!initializing && user && canAccessSaas(user) && !tenantId) {
      router.replace("/saas");
    }
  }, [initializing, router, tenantId, user]);

  const operationsQuery = useQuery({
    queryKey: ["kpi-operations"],
    queryFn: () => get<OperationsKpis>("/kpi/operations"),
    enabled: allowed,
    staleTime: 60_000
  });

  const inventoryQuery = useQuery({
    queryKey: ["kpi-inventory"],
    queryFn: () => get<InventoryKpis>("/kpi/inventory"),
    enabled: allowed,
    staleTime: 60_000
  });

  if (initializing || permissionInit) {
    return <LoadingSpinner message="Verificando sesión..." />;
  }

  const operations = operationsQuery.data;
  const inventory = inventoryQuery.data;

  const quickActions = [
    { label: "Registrar recepción", href: `/inbound/create${tenantParam}`, icon: Truck },
    { label: "Crear ola de picking", href: `/waves/create${tenantParam}`, icon: ScanLine },
    { label: "Lanzar outbound", href: `/outbound/create${tenantParam}`, icon: ArrowUpRight },
    { label: "Configurar bodega", href: `/settings/warehouses${tenantParam}`, icon: ClipboardList }
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard operativo</h1>
            <p className="text-sm text-muted-foreground">
              {dateLabel} · {timeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action.label} variant="outline" size="sm" asChild>
                <Link href={action.href} className="flex items-center gap-2">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            title="Recepciones del día"
            value={formatNumber(operations?.inboundToday)}
            icon={ArrowDownLeft}
            description="Inbound activo"
          />
          <KpiCard
            title="Órdenes liberadas"
            value={formatNumber(operations?.releasedOrders)}
            icon={ClipboardList}
            description="Outbound en cola"
          />
          <KpiCard title="En picking" value={formatNumber(operations?.pickingOrders)} icon={ScanLine} />
          <KpiCard title="Completadas" value={formatNumber(operations?.completedOrders)} icon={PackageCheck} />
          <KpiCard title="Waves activas" value={formatNumber(operations?.activeWaves)} icon={Gauge} />
          <KpiCard title="Replenishments" value={formatNumber(operations?.replenishmentsPending)} icon={Boxes} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DashboardSection
            title="Rendimiento de picking"
            description="Líneas procesadas por hora"
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Tendencia horaria</CardTitle>
                <CardDescription>Últimas 8 horas</CardDescription>
              </CardHeader>
              <CardContent>
                {operationsQuery.isLoading ? (
                  <LoadingSpinner message="Calculando productividad..." />
                ) : operationsQuery.isError ? (
                  <p className="text-sm text-destructive">No pudimos obtener los KPIs operativos.</p>
                ) : (
                  <MiniTrendChart data={operations?.pickingPerformance.map((item) => item.lines) ?? []} />
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {operations?.pickingPerformance.map((item) => (
                    <span key={item.hour} className="rounded-full bg-muted px-2 py-1">
                      {item.hour}: {item.lines} líneas
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          <Card>
            <CardHeader>
              <CardTitle>Inventario activo</CardTitle>
              <CardDescription>Stock disponible y comprometido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <KpiCard title="SKUs activos" value={formatNumber(inventory?.activeSkus)} icon={Boxes} />
                <KpiCard title="Stock total" value={formatNumber(inventory?.totalStock)} icon={Boxes} />
                <KpiCard title="Disponible" value={formatNumber(inventory?.availableStock)} icon={PackageCheck} />
                <KpiCard title="Comprometido" value={formatNumber(inventory?.committedStock)} icon={ClipboardList} />
                <KpiCard title="Bloqueado" value={formatNumber(inventory?.damagedStock)} icon={Gauge} />
              </div>
            </CardContent>
          </Card>
        </div>

        <DashboardSection title="Ocupación por zona" description="Capacidad utilizada por área">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {inventoryQuery.isLoading ? (
                <LoadingSpinner message="Calculando ocupación..." />
              ) : inventoryQuery.isError ? (
                <p className="text-sm text-destructive">No pudimos cargar el estado de zonas.</p>
              ) : (
                inventory?.zones.map((zone) => (
                  <div key={zone.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{zone.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatNumber(zone.utilization * 100, 1)}%
                      </span>
                    </div>
                    <Progress value={zone.utilization * 100} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </DashboardSection>
      </div>
    </AppShell>
  );
}
