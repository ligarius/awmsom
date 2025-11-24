"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import type { TenantUser } from "@/types/saas";
import type { PaginatedResult } from "@/types/common";
import type { ColumnDef } from "@tanstack/react-table";
import { useApi } from "@/hooks/useApi";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";

export default function UsersPage() {
  const router = useRouter();
  const { get, post } = useApi();
  const [data, setData] = useState<PaginatedResult<TenantUser>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [selected, setSelected] = useState<TenantUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    get<TenantUser[] | PaginatedResult<TenantUser>>("/users")
      .then((response) => {
        if (Array.isArray(response)) setData({ items: response, total: response.length, page: 1, pageSize: 10 });
        else setData(response);
      })
      .catch(() => toast({ title: "No pudimos cargar los usuarios", variant: "destructive" }));
  }, [get]);

  const toggleUser = async () => {
    if (!selected) return;
    const endpoint = selected.status === "ACTIVE" ? `/users/${selected.id}/deactivate` : `/users/${selected.id}/activate`;
    await post(endpoint);
    const refreshed = await get<TenantUser[] | PaginatedResult<TenantUser>>("/users");
    if (Array.isArray(refreshed)) setData({ items: refreshed, total: refreshed.length, page: 1, pageSize: 10 });
    else setData(refreshed);
    setDialogOpen(false);
    toast({ title: "Estado actualizado" });
  };

  const columns: ColumnDef<TenantUser>[] = useMemo(
    () => [
      { accessorKey: "fullName", header: "Nombre" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Rol" },
      { accessorKey: "createdAt", header: "Creado", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
      { accessorKey: "status", header: "Estado", cell: ({ row }) => <UserStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/users/${row.original.id}`}>Ver</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/users/${row.original.id}/edit`}>Editar</Link>
            </Button>
            <Button
              variant={row.original.status === "ACTIVE" ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                setSelected(row.original);
                setDialogOpen(true);
              }}
            >
              {row.original.status === "ACTIVE" ? "Desactivar" : "Activar"}
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
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestiona cuentas, roles y estado de acceso.</p>
        </div>
        <Button onClick={() => router.push("/settings/users/create")}>Crear usuario</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del tenant</CardTitle>
          <CardDescription>Listado con filtros, ordenamiento y acciones rápidas.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${selected?.status === "ACTIVE" ? "Desactivar" : "Activar"} usuario`}
        description="El usuario no podrá acceder mientras esté inactivo."
        onConfirm={toggleUser}
        confirmLabel={selected?.status === "ACTIVE" ? "Desactivar" : "Activar"}
      />
    </AppShell>
  );
}
