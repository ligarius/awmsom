"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { Warehouse } from "@/types/wms";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { usePermissions } from "@/hooks/usePermissions";

export default function WarehousesPage() {
  const router = useRouter();
  const { get } = useApi();
  const { canReadWmsConfig, canWriteWmsConfig } = usePermissions();
  const [data, setData] = useState<PaginatedResult<Warehouse>>({ items: [], total: 0, page: 1, pageSize: 20 });

  useEffect(() => {
    if (!canReadWmsConfig) return;
    get<Warehouse[] | PaginatedResult<Warehouse>>("/warehouses")
      .then((response) => {
        if (Array.isArray(response)) setData({ items: response, total: response.length, page: 1, pageSize: 20 });
        else setData(response);
      })
      .catch(() => toast({ title: "No pudimos cargar las bodegas", variant: "destructive" }));
  }, [canReadWmsConfig, get]);

  const columns: ColumnDef<Warehouse>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "code", header: "Código" },
      { header: "País / Ciudad", cell: ({ row }) => `${row.original.country ?? "-"} / ${row.original.city ?? "-"}` },
      { header: "Activa", cell: ({ row }) => (row.original.isActive ? "Sí" : "No") },
      { header: "Creada", cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : "-") },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/warehouses/${row.original.id}`}>Ver</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/warehouses/${row.original.id}/edit`}>Editar</Link>
            </Button>
          </div>
        )
      }
    ],
    []
  );

  if (!canReadWmsConfig) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>No tienes permisos para ver esta sección.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader
        title="Bodegas"
        description="Administra las bodegas disponibles en el tenant"
        actions={
          canWriteWmsConfig ? <Button onClick={() => router.push("/settings/warehouses/create")}>Crear bodega</Button> : null
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Gestiona los centros de distribución y su estado.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
