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

export default function MovementsReportPage() {
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-movements", filters],
    queryFn: () => get<ReportRow[]>("/reports/movements", filters),
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
          <h1 className="text-2xl font-bold">Reporte de movimientos</h1>
          <ExportButton data={exportRows} filename="reporte-movimientos" disabled={!rows.length} />
        </div>

        <FilterBarAdvanced storageKey="report-movements" onChange={(f) => setFilters(f)} />

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Movimientos internos</CardTitle>
            <button className="text-sm text-primary" onClick={() => refetch()}>
              Refrescar
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner message="Cargando movimientos..." />
            ) : isError ? (
              <p className="text-sm text-destructive">No pudimos cargar el reporte.</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros para los filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2">Movimiento</th>
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Usuario</th>
                      <th className="pb-2">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/40">
                        <td className="py-2 font-medium">{row.reference}</td>
                        <td className="py-2">{new Date(row.date).toLocaleString()}</td>
                        <td className="py-2">{row.type ?? "-"}</td>
                        <td className="py-2">{row.customer ?? "-"}</td>
                        <td className="py-2">{row.amount ?? 0}</td>
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
