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
import type { Movement } from "@/types/operations";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter, useSearchParams } from "next/navigation";

export default function MovementsPage() {
  const router = useRouter();
  const { canMovementsWrite } = usePermissions();
  const { get } = useApi();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const tenantParam = tenantId ? `?tenantId=${tenantId}` : "";
  const [data, setData] = useState<PaginatedResult<Movement>>({ items: [], page: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    if (!canMovementsWrite) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<Movement>>("/movements")
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar movimientos", variant: "destructive" }));
  }, [canMovementsWrite, get, router]);

  const columns: ColumnDef<Movement>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "createdAt", header: "Fecha" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "fromLocation", header: "Origen" },
      { accessorKey: "toLocation", header: "Destino" },
      { accessorKey: "sku", header: "Producto" },
      { accessorKey: "quantity", header: "Cantidad" },
      { accessorKey: "user", header: "Usuario" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/movements/${row.original.id}${tenantParam}`}>Ver</Link>
          </Button>
        )
      }
    ],
    [tenantParam]
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Movimientos internos</h1>
          <p className="text-sm text-muted-foreground">Registro detallado de traslados internos</p>
        </div>
        <Button asChild>
          <Link href={`/movements/create${tenantParam}`}>Crear movimiento</Link>
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Filtra por fecha y usuario en backend</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
