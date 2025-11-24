"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { FilterBarAdvanced } from "@/components/analytics/FilterBarAdvanced";
import { ExportButton } from "@/components/analytics/ExportButton";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { ReportRow } from "@/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InboundReportPage() {
  const { allowed, initializing } = usePermissionGuard("REPORTS_READ");
  const { get } = useApi();
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-inbound", filters],
    queryFn: () => get<ReportRow[]>("/reports/inbound", filters),
    enabled: allowed,
    staleTime: 30_000
  });

  const rows = data ?? [];
  const exportRows = useMemo(() => rows.map((row) => ({ ...row, date: new Date(row.date).toLocaleString() })), [rows]);

  if (initializing || !allowed) return <LoadingSpinner message="Validando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reporte de inbound</h1>
          <ExportButton data={exportRows} filename="reporte-inbound" disabled={!rows.length} />
        </div>

        <FilterBarAdvanced storageKey="report-inbound" onChange={(f) => setFilters(f)} />

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recepciones</CardTitle>
            <button className="text-sm text-primary" onClick={() => refetch()}>
              Refrescar
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner message="Cargando recepciones..." />
            ) : isError ? (
              <p className="text-sm text-destructive">No pudimos cargar el reporte.</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay recepciones para los filtros seleccionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2">Referencia</th>
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Estado</th>
                      <th className="pb-2">Bodega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/40">
                        <td className="py-2 font-medium">{row.reference}</td>
                        <td className="py-2">{new Date(row.date).toLocaleString()}</td>
                        <td className="py-2">{row.status}</td>
                        <td className="py-2">{row.warehouse ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
