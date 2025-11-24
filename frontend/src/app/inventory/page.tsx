"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import type { PaginatedResult } from "@/types/common";
import type { InventorySummary } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { InventoryCard } from "@/components/operations/InventoryCard";

export default function InventoryPage() {
  const router = useRouter();
  const { canInventoryRead } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<InventorySummary>>({ items: [], page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ sku: "", class: "", warehouse: "" });

  useEffect(() => {
    if (!canInventoryRead) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<InventorySummary>>("/inventory", filters)
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar inventario", variant: "destructive" }));
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
        cell: ({ row }) => <Link className="text-primary" href={`/inventory/${row.original.productId}`}>Ver</Link>
      }
    ],
    []
  );

  return (
    <AppShell>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground">Visión unificada del stock</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Encuentra SKUs por código, clase o bodega.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="SKU" value={filters.sku} onChange={(e) => setFilters((p) => ({ ...p, sku: e.target.value }))} />
          <Input
            placeholder="Clase de producto"
            value={filters.class}
            onChange={(e) => setFilters((p) => ({ ...p, class: e.target.value }))}
          />
          <Input
            placeholder="Bodega"
            value={filters.warehouse}
            onChange={(e) => setFilters((p) => ({ ...p, warehouse: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Stock por producto</CardTitle>
          <CardDescription>Totales y concentraciones</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.items.map((item) => (
          <InventoryCard key={item.productId} summary={item} />
        ))}
      </div>
    </AppShell>
  );
}
