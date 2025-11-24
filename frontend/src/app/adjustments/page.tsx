"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { Adjustment } from "@/types/operations";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

export default function AdjustmentsPage() {
  const router = useRouter();
  const { canAdjustmentsWrite } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<Adjustment>>({ items: [], page: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    if (!canAdjustmentsWrite) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<Adjustment>>("/adjustments")
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar ajustes", variant: "destructive" }));
  }, [canAdjustmentsWrite, get, router]);

  const columns: ColumnDef<Adjustment>[] = useMemo(
    () => [
      { accessorKey: "code", header: "Código" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "sku", header: "Producto" },
      { accessorKey: "quantity", header: "Cantidad" },
      { accessorKey: "reason", header: "Motivo" },
      { accessorKey: "user", header: "Usuario" },
      { accessorKey: "createdAt", header: "Fecha" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/adjustments/${row.original.id}`}>Ver</Link>
          </Button>
        )
      }
    ],
    []
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ajustes de inventario</h1>
          <p className="text-sm text-muted-foreground">Control y auditoría de ajustes manuales</p>
        </div>
        <Button asChild>
          <Link href="/adjustments/create">Registrar ajuste</Link>
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Seguimiento de aumentos y disminuciones</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
