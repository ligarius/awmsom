"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { InventoryByLocation } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

export default function InventoryByLocationPage() {
  const router = useRouter();
  const { canInventoryRead } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<InventoryByLocation>>({ items: [], page: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    if (!canInventoryRead) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<InventoryByLocation>>("/inventory/by-location")
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar inventario por ubicación", variant: "destructive" }));
  }, [canInventoryRead, get, router]);

  const columns: ColumnDef<InventoryByLocation>[] = useMemo(
    () => [
      { accessorKey: "locationCode", header: "Ubicación" },
      { accessorKey: "sku", header: "Producto" },
      { accessorKey: "quantity", header: "Cantidad" },
      { accessorKey: "batch", header: "Lote" },
      { accessorKey: "updatedAt", header: "Última actualización" }
    ],
    []
  );

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Inventario por ubicación</CardTitle>
          <CardDescription>Visibilidad precisa en el layout</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
