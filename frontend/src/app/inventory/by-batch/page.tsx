"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { InventoryByBatch } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

export default function InventoryByBatchPage() {
  const router = useRouter();
  const { canInventoryRead } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<InventoryByBatch>>({ items: [], page: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    if (!canInventoryRead) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<InventoryByBatch>>("/inventory/by-batch")
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar inventario por lote", variant: "destructive" }));
  }, [canInventoryRead, get, router]);

  const columns: ColumnDef<InventoryByBatch>[] = useMemo(
    () => [
      { accessorKey: "batch", header: "Lote" },
      { accessorKey: "sku", header: "Producto" },
      { accessorKey: "quantity", header: "Cantidad" },
      { accessorKey: "expiresAt", header: "Vencimiento" },
      { accessorKey: "warehouseName", header: "Bodega" },
      { accessorKey: "locationCode", header: "Ubicación" }
    ],
    []
  );

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Inventario por lote</CardTitle>
          <CardDescription>Control para productos batch-managed</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
