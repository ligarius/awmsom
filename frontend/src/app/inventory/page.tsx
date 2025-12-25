"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/layout/FilterBar";
import { TableShell } from "@/components/layout/TableShell";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import type { PaginatedResult } from "@/types/common";
import type { InventorySummary } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryCard } from "@/components/operations/InventoryCard";

export default function InventoryPage() {
  const router = useRouter();
  const { canInventoryRead } = usePermissions();
  const { get } = useApi();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const tenantParam = tenantId ? `?tenantId=${tenantId}` : "";
  const [data, setData] = useState<PaginatedResult<InventorySummary>>({ items: [], page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ sku: "", class: "", warehouse: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canInventoryRead) {
      router.replace("/forbidden");
      return;
    }
    setLoading(true);
    setError(false);
    get<PaginatedResult<InventorySummary>>("/inventory", filters)
      .then((res) => setData(res))
      .catch(() => {
        setError(true);
        toast({ title: "No pudimos cargar inventario", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [canInventoryRead, filters, get, router]);

  const columns: ColumnDef<InventorySummary>[] = useMemo(
    () => [
      { accessorKey: "sku", header: "Producto" },
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "totalUnits", header: "Total unidades" },
      { accessorKey: "totalUom", header: "Total UoM" },
      { accessorKey: "batchCount", header: "Lotes" },
      { accessorKey: "locationCount", header: "Ubicaciones" },
      {
        id: "actions",
        header: "Detalle",
        cell: ({ row }) => (
          <Link className="text-primary" href={`/inventory/${row.original.productId}${tenantParam}`}>
            Ver
          </Link>
        )
      }
    ],
    [tenantParam]
  );

  return (
    <PageShell>
      <PageHeader title="Inventario" description="Vision unificada del stock por producto y ubicacion." />

      <FilterBar
        hint="Filtros principales para SKU, clase y bodega activa."
        search={{
          value: filters.sku,
          onChange: (value) => setFilters((prev) => ({ ...prev, sku: value })),
          placeholder: "Buscar SKU o codigo"
        }}
        filters={
          <>
            <Input
              placeholder="Clase de producto"
              value={filters.class}
              onChange={(e) => setFilters((prev) => ({ ...prev, class: e.target.value }))}
            />
            <Input
              placeholder="Bodega"
              value={filters.warehouse}
              onChange={(e) => setFilters((prev) => ({ ...prev, warehouse: e.target.value }))}
            />
          </>
        }
        onMoreFilters={() => toast({ title: "Filtros avanzados en desarrollo" })}
      />

      <TableShell
        title="Stock por producto"
        description="Totales, lotes y ubicaciones disponibles."
        isLoading={loading}
        isError={error}
        isEmpty={!loading && !error && data.items.length === 0}
        emptyTitle="No hay inventario para mostrar"
        emptyDescription="Ajusta los filtros o verifica las integraciones."
      >
        <DataTable columns={columns} data={data} variant="bare" />
      </TableShell>

      <div className="grid gap-4 md:grid-cols-3">
        {data.items.map((item) => (
          <InventoryCard key={item.productId} summary={item} />
        ))}
      </div>
    </PageShell>
  );
}
