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
import type { CycleCountDocument } from "@/types/operations";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

export default function CycleCountPage() {
  const router = useRouter();
  const { canCycleCountCreate } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<CycleCountDocument>>({ items: [], page: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    if (!canCycleCountCreate) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<CycleCountDocument>>("/cycle-count")
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar conteos", variant: "destructive" }));
  }, [canCycleCountCreate, get, router]);

  const columns: ColumnDef<CycleCountDocument>[] = useMemo(
    () => [
      { accessorKey: "code", header: "Código" },
      { accessorKey: "warehouseName", header: "Bodega" },
      { accessorKey: "status", header: "Estado" },
      { accessorKey: "assignedTo", header: "Usuario" },
      { accessorKey: "createdAt", header: "Fecha" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/cycle-count/${row.original.id}`}>Ver</Link>
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
          <h1 className="text-2xl font-semibold">Inventarios cíclicos</h1>
          <p className="text-sm text-muted-foreground">Control continuo de stock</p>
        </div>
        <Button asChild>
          <Link href="/cycle-count/create">Crear tarea</Link>
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tareas</CardTitle>
          <CardDescription>Verifica el avance de los conteos</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
