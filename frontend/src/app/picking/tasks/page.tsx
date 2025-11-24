"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { PickingTask } from "@/types/operations";

export default function PickingTasksPage() {
  const router = useRouter();
  const { canPickingRead } = usePermissions();
  const { get } = useApi();

  useEffect(() => {
    if (!canPickingRead) router.replace("/forbidden");
  }, [canPickingRead, router]);

  const tasksQuery = useQuery({
    queryKey: ["picking", "tasks", "list"],
    queryFn: () => get<PaginatedResult<PickingTask>>("/picking/tasks"),
    enabled: canPickingRead,
    onError: () => toast({ title: "No pudimos cargar tareas", variant: "destructive" })
  });

  const columns: ColumnDef<PickingTask>[] = [
    { accessorKey: "code", header: "Código" },
    {
      id: "product",
      header: "Producto",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{row.original.productSku}</p>
          <p className="text-xs text-muted-foreground">{row.original.productName}</p>
        </div>
      )
    },
    { accessorKey: "quantity", header: "Cantidad" },
    { accessorKey: "locationCode", header: "Ubicación" },
    { accessorKey: "status", header: "Estado" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/picking/tasks/${row.original.id}`}>Ejecutar</Link>
        </Button>
      )
    }
  ];

  if (!canPickingRead) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tareas de picking</h1>
          <p className="text-sm text-muted-foreground">Todas las tareas asignadas al operario.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tareas</CardTitle>
          <CardDescription>Ejecuta paso a paso cada tarea.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={tasksQuery.data ?? { items: [], page: 1, pageSize: 20, total: 0 }} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
