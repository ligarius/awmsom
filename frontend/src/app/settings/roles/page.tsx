"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import type { PaginatedResult } from "@/types/common";
import type { ColumnDef } from "@tanstack/react-table";
import type { Role } from "@/types/saas";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";

export default function RolesPage() {
  const router = useRouter();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<Role>>({ items: [], total: 0, page: 1, pageSize: 10 });

  useEffect(() => {
    get<Role[] | PaginatedResult<Role>>("/roles")
      .then((response) => {
        if (Array.isArray(response)) setData({ items: response, total: response.length, page: 1, pageSize: 10 });
        else setData(response);
      })
      .catch(() => toast({ title: "No pudimos cargar los roles", variant: "destructive" }));
  }, [get]);

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Rol" },
      { accessorKey: "description", header: "Descripción" },
      { accessorKey: "userCount", header: "Usuarios", cell: ({ getValue }) => getValue<number>() ?? 0 },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/roles/${row.original.id}`}>Ver</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/roles/${row.original.id}/edit`}>Editar</Link>
            </Button>
          </div>
        )
      }
    ],
    []
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-muted-foreground">Define permisos y asignaciones.</p>
        </div>
        <Button onClick={() => router.push("/settings/roles/create")}>Crear rol</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Roles del tenant</CardTitle>
          <CardDescription>Plantillas de permisos para asignar a usuarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
