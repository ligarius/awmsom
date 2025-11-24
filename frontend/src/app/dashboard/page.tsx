"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthContext } from "@/providers/AuthProvider";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import type { PaginatedResult } from "@/types/common";
import type { Warehouse } from "@/types/wms";
import { Activity, Boxes, CheckCircle2, Clock3, Network, Zap } from "lucide-react";

interface CapacityKpis {
  space: {
    utilization: number;
    occupiedLocations: number;
    totalLocations: number;
  };
  labor: {
    utilization: number;
    capacityHours: number;
    actualHours: number;
    operators: number;
    shiftHours: number;
  };
}

interface ProductivityKpis {
  workloadByOperator: {
    operatorId?: string | null;
    tasks: number;
    lines: number;
    units: number;
    hours: number;
  }[];
  throughputByWarehouse: {
    warehouseId: string;
    shipments: number;
    orders: number;
    lines: number;
    units: number;
  }[];
}

interface KpiSummaryResponse {
  capacity: CapacityKpis;
  productivity: ProductivityKpis;
  picking?: {
    linesPerHour?: number;
    unitsPerHour?: number;
  };
  service?: {
    fillRate?: number;
    otif?: number;
  };
}

interface AuditLog {
  id: string;
  resource: string;
  action: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

function formatPercent(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value?: number) {
  if (value === undefined) return "0";
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

export default function DashboardPage() {
  const { user, initializing } = useAuthContext();
  const { get } = useApi();
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [zone, setZone] = useState<string>("");

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data: warehouses, isLoading: loadingWarehouses } = useQuery({
    queryKey: ["warehouses", "dashboard"],
    queryFn: () => get<Warehouse[] | PaginatedResult<Warehouse>>("/warehouses"),
    select: (response) => (Array.isArray(response) ? response : response.items ?? []),
    enabled: !!user
  });

  useEffect(() => {
    if (warehouseId || !warehouses?.length) return;
    const active = warehouses.find((wh) => wh.isActive) ?? warehouses[0];
    setWarehouseId(active.id);
  }, [warehouseId, warehouses]);

  const {
    data: kpis,
    isLoading: loadingKpis,
    isError: kpiError,
    refetch: refetchKpis
  } = useQuery({
    queryKey: ["kpi-summary", dateRange.from, dateRange.to, warehouseId, zone],
    queryFn: () =>
      get<KpiSummaryResponse>("/kpis/summary", {
        fromDate: dateRange.from,
        toDate: dateRange.to,
        warehouseId: warehouseId || undefined,
        zone: zone || undefined
      }),
    enabled: !!user && Boolean(dateRange.from && dateRange.to && (warehouseId || warehouses?.length)),
    retry: 1
  });

  const {
    data: auditLogs,
    isLoading: loadingLogs,
    isError: logsError
  } = useQuery({
    queryKey: ["audit", "logs"],
    queryFn: () => get<AuditLog[]>("/audit/logs", { page: 1, limit: 6 }),
    enabled: !!user
  });

  if (initializing) {
    return <LoadingSpinner message="Verificando sesión..." />;
  }

  const throughput = kpis?.productivity.throughputByWarehouse ?? [];
  const operators = kpis?.productivity.workloadByOperator ?? [];
  const maxThroughput = Math.max(...throughput.map((item) => item.orders), 1);
  const spaceUtilization = kpis?.capacity.space.utilization ?? 0;
  const laborUtilization = kpis?.capacity.labor.utilization ?? 0;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bienvenido, {user?.fullName ?? "operador"}</CardTitle>
            <CardDescription>
              KPIs dinámicos por tenant y bodega activa, productividad en vivo y un timeline con lo último en operaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">Tenant</div>
                <div className="text-xl font-semibold">{user?.tenant ?? "No asignado"}</div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">Rol</div>
                <div className="text-xl font-semibold">{user?.role ?? "Pendiente de rol"}</div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">Rango</div>
                <div className="text-xl font-semibold">Últimos 7 días</div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Bodega</div>
                <Select value={warehouseId} onValueChange={setWarehouseId} disabled={loadingWarehouses}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingWarehouses ? "Cargando bodegas..." : "Selecciona bodega"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name || wh.code || wh.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Zona</div>
                <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ej. A1, mezzanine" />
              </div>
              <div className="flex items-end justify-end">
                <Button variant="outline" onClick={() => refetchKpis()} disabled={loadingKpis}>
                  Refrescar KPIs
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Las métricas se calculan con los filtros activos (tenant y bodega) e incluyen capacidad ocupada, productividad por
              hora y throughput de salida.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Capacidad ocupada</CardTitle>
                <CardDescription>Espacio utilizado vs. ubicaciones totales</CardDescription>
              </div>
              <Boxes className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingKpis ? (
                <LoadingSpinner message="Cargando capacidad..." />
              ) : kpiError ? (
                <div className="text-sm text-destructive">No se pudo cargar la capacidad para esta bodega.</div>
              ) : kpis ? (
                <>
                  <div className="text-3xl font-bold">{formatPercent(spaceUtilization)}</div>
                  <Progress value={spaceUtilization * 100} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(kpis.capacity.space.occupiedLocations)} de {formatNumber(kpis.capacity.space.totalLocations)}
                    {" "}
                    ubicaciones en uso.
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Sin datos de capacidad para el filtro actual.</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Capacidad laboral</CardTitle>
                <CardDescription>Horas consumidas vs. planeadas</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingKpis ? (
                <LoadingSpinner message="Calculando carga laboral..." />
              ) : kpiError ? (
                <div className="text-sm text-destructive">No pudimos calcular la utilización de operadores.</div>
              ) : kpis ? (
                <>
                  <div className="text-3xl font-bold">{formatPercent(laborUtilization)}</div>
                  <Progress value={laborUtilization * 100} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {kpis.capacity.labor.actualHours.toFixed(1)}h de {kpis.capacity.labor.capacityHours.toFixed(1)}h planificadas
                    ({kpis.capacity.labor.operators} operadores, turno {kpis.capacity.labor.shiftHours}h).
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Sin información laboral disponible.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Productividad y throughput</CardTitle>
              <CardDescription>Comparativo por bodega y operador</CardDescription>
            </div>
            <Zap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingKpis ? (
              <LoadingSpinner message="Cargando productividad..." />
            ) : kpiError ? (
              <div className="text-sm text-destructive">Hubo un problema al obtener los KPIs de productividad.</div>
            ) : kpis ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Throughput por bodega</p>
                        <p className="text-2xl font-semibold">{formatNumber(throughput.reduce((acc, t) => acc + t.orders, 0))} órdenes</p>
                      </div>
                      <Network className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {throughput.length === 0 && <p className="text-sm text-muted-foreground">Sin envíos recientes.</p>}
                      {throughput.map((item) => (
                        <div key={item.warehouseId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{item.warehouseId}</span>
                            <span className="font-medium">{formatNumber(item.orders)} órdenes</span>
                          </div>
                          <Progress value={(item.orders / maxThroughput) * 100} />
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(item.shipments)} despachos · {formatNumber(item.units)} unidades
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Carga por operador</p>
                        <p className="text-2xl font-semibold">{formatNumber(operators.reduce((acc, op) => acc + op.tasks, 0))} tareas</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {operators.length === 0 && <p className="text-sm text-muted-foreground">Sin tareas asignadas en el rango.</p>}
                      {operators.map((op, index) => (
                        <div key={`${op.operatorId ?? "unassigned"}-${index}`} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{op.operatorId ?? "Sin asignar"}</span>
                            <Badge variant="secondary">{formatNumber(op.lines)} líneas</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(op.tasks)} tareas · {formatNumber(op.units)} unidades · {op.hours.toFixed(1)}h
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Velocidad de picking</p>
                        <p className="text-2xl font-semibold">{(kpis.picking?.linesPerHour ?? 0).toFixed(1)} l/h</p>
                      </div>
                      <Clock3 className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{(kpis.picking?.unitsPerHour ?? 0).toFixed(1)} u/h registradas.</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Fill rate y OTIF</p>
                        <p className="text-2xl font-semibold">{formatPercent(kpis.service?.fillRate)}</p>
                      </div>
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">OTIF: {formatPercent(kpis.service?.otif)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No hay datos para los filtros seleccionados.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline reciente</CardTitle>
            <CardDescription>Eventos de auditoría del tenant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingLogs ? (
              <LoadingSpinner message="Leyendo eventos..." />
            ) : logsError ? (
              <div className="text-sm text-destructive">No pudimos recuperar el timeline.</div>
            ) : (auditLogs?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">Sin eventos recientes.</div>
            ) : (
              <ul className="space-y-3">
                {auditLogs?.map((log) => (
                  <li key={log.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{log.resource}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Acción: {log.action}</p>
                    {log.metadata && (
                      <p className="text-xs text-muted-foreground truncate">{JSON.stringify(log.metadata)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
