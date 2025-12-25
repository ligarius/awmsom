"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Building2, Boxes, PlusCircle, Users } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContentSection } from "@/components/layout/ContentSection";
import { NavigationCard } from "@/components/layout/NavigationCard";
import { TableShell } from "@/components/layout/TableShell";
import { DataTable } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { KpiCard } from "@/components/analytics/KpiCard";
import { LoadingState } from "@/components/layout/LoadingState";
import { formatPlanLabel } from "@/lib/plans";
import type { PaginatedResult } from "@/types/common";
import type { SaasOverview, Tenant } from "@/types/saas";

export default function SaasAdminPage() {
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<Tenant>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [overview, setOverview] = useState<SaasOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    get<Tenant[] | PaginatedResult<Tenant>>("/saas/tenants")
      .then((response) => {
        if (Array.isArray(response)) {
          setData({ items: response, total: response.length, page: 1, pageSize: 10 });
        } else {
          setData(response);
        }
      })
      .catch(() => {
        setError(true);
        toast({ title: "No pudimos cargar los tenants", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [get]);

  useEffect(() => {
    setOverviewError(false);
    get<SaasOverview>("/saas/overview")
      .then(setOverview)
      .catch(() => setOverviewError(true));
  }, [get]);

  const formatNumber = (value: number) => new Intl.NumberFormat("es-ES").format(value);

  const columns: ColumnDef<Tenant>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Empresa" },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <UserStatusBadge status={row.original.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"} />
      },
      {
        accessorKey: "plan",
        header: "Plan",
        cell: ({ getValue }) => <span>{formatPlanLabel(getValue<string>())}</span>
      },
      { accessorKey: "createdAt", header: "Creado", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard?tenantId=${row.original.id}`}>Entrar como admin</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/saas/tenants/${row.original.id}/processes`}>Operaciones</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/saas/tenants/${row.original.id}`}>Detalle</Link>
            </Button>
          </div>
        )
      }
    ],
    []
  );

  const planBreakdown = overview?.tenants.plans ?? [];
  const recentErrors = overview?.errors.recent ?? [];
  const activeAlerts = overview?.alerts.active ?? [];

  const quickLinks = [
    {
      title: "Empresas",
      description: "Ver todas las empresas del SaaS.",
      href: "/saas/tenants",
      icon: <Building2 className="h-4 w-4" />
    },
    {
      title: "Crear empresa",
      description: "Alta de nuevo tenant.",
      href: "/saas/tenants/create",
      icon: <PlusCircle className="h-4 w-4" />
    }
  ];

  return (
    <PageShell size="wide">
      <PageHeader
        title="Panel principal SaaS"
        description="Vista global del portafolio de empresas y accesos rapidos a operaciones."
        actions={
          <Button size="sm" asChild>
            <Link href="/saas/tenants/create">Crear empresa</Link>
          </Button>
        }
      />

      <ContentSection title="Resumen macro" description="KPIs agregados del SaaS y salud operativa.">
        {overview ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Empresas totales"
              value={formatNumber(overview.tenants.total)}
              description={`${overview.tenants.active} activas · ${overview.tenants.suspended} suspendidas`}
              icon={Building2}
            />
            <KpiCard
              title="Usuarios activos"
              value={formatNumber(overview.usage.users)}
              description="Usuarios totales registrados"
              icon={Users}
            />
            <KpiCard
              title="Órdenes del mes"
              value={formatNumber(overview.usage.monthlyOrders)}
              description="Órdenes outbound en el período"
              icon={Boxes}
            />
            <KpiCard
              title="Errores reportados"
              value={formatNumber(overview.errors.total)}
              description={`Alertas activas: ${overview.alerts.totalActive}`}
              icon={AlertTriangle}
              emphasis={overview.errors.total > 0 ? "warning" : "default"}
            />
          </div>
        ) : overviewError ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No pudimos cargar el resumen del SaaS.
          </div>
        ) : (
          <LoadingState message="Cargando resumen..." />
        )}
      </ContentSection>

      <ContentSection title="Salud y alertas" description="Señales recientes y alertas críticas.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Alertas activas</h3>
            <p className="text-xs text-muted-foreground">SLOs en riesgo o degradados.</p>
            <div className="mt-3 space-y-2 text-sm">
              {activeAlerts.length === 0 && <p className="text-muted-foreground">Sin alertas activas.</p>}
              {activeAlerts.map((alert) => (
                <div key={`${alert.service}-${alert.id}`} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <p className="font-medium">{alert.service.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{alert.condition}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{alert.severity}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Errores recientes</h3>
            <p className="text-xs text-muted-foreground">Últimos eventos reportados por servicio.</p>
            <div className="mt-3 space-y-2 text-sm">
              {recentErrors.length === 0 && <p className="text-muted-foreground">Sin errores en memoria.</p>}
              {recentErrors.map((errorItem) => (
                <div key={`${errorItem.service}-${errorItem.timestamp}`} className="rounded-md border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{errorItem.service}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(errorItem.timestamp).toLocaleTimeString("es-ES")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{errorItem.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ContentSection>

      <ContentSection title="Distribución por plan" description="Mix de planes activos en la plataforma.">
        <div className="grid gap-3 md:grid-cols-3">
          {planBreakdown.map((plan) => (
            <div key={plan.code} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{formatPlanLabel(plan.code)}</p>
              <p className="text-sm text-muted-foreground">{formatNumber(plan.count)} empresas</p>
            </div>
          ))}
          {!planBreakdown.length && (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Sin planes registrados.</div>
          )}
        </div>
      </ContentSection>

      <ContentSection title="Acceso rapido" description="Gestiona el alta y monitoreo del portafolio.">
        <div className="grid gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
            <NavigationCard key={link.title} {...link} />
          ))}
        </div>
      </ContentSection>

      <TableShell
        title="Empresas activas"
        description="Selecciona una empresa y entra a sus operaciones."
        isLoading={loading}
        isError={error}
        isEmpty={!loading && !error && data.items.length === 0}
        emptyTitle="Sin empresas registradas"
        emptyDescription="Crea el primer tenant para iniciar la operacion."
      >
        <DataTable columns={columns} data={data} variant="bare" />
      </TableShell>
    </PageShell>
  );
}
