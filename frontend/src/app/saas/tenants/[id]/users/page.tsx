"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { TenantShell } from "@/components/saas/TenantShell";
import { TableShell } from "@/components/layout/TableShell";
import { DataTable } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layout/LoadingState";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import type { PaginatedResult } from "@/types/common";
import type { Tenant, TenantUser } from "@/types/saas";

export default function TenantUsersPage() {
  const params = useParams();
  const { get } = useApi();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [data, setData] = useState<PaginatedResult<TenantUser>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        const tenantResponse = await get<Tenant>(`/saas/tenants/${params.id}`);
        setTenant(tenantResponse);
        const usersResponse = await get<TenantUser[] | { items: TenantUser[] }>(`/saas/tenants/${params.id}/users`);
        if (Array.isArray(usersResponse)) {
          setData({ items: usersResponse, total: usersResponse.length, page: 1, pageSize: 20 });
        } else {
          setData({ items: usersResponse.items, total: usersResponse.items.length, page: 1, pageSize: 20 });
        }
      } catch (err) {
        setError(true);
        toast({ title: "No pudimos cargar usuarios del tenant", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [get, params.id]);

  const columns: ColumnDef<TenantUser>[] = useMemo(
    () => [
      { accessorKey: "fullName", header: "Usuario" },
      { accessorKey: "email", header: "Correo" },
      { accessorKey: "role", header: "Rol" },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <UserStatusBadge status={row.original.status} />
      },
      {
        accessorKey: "lastLogin",
        header: "Ultimo acceso",
        cell: ({ getValue }) => {
          const value = getValue<string | undefined>();
          return value ? new Date(value).toLocaleString() : "Sin registro";
        }
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/settings/users/${row.original.id}?tenantId=${params.id}`}>Ver</Link>
          </Button>
        )
      }
    ],
    []
  );

  if (!tenant) {
    return (
      <TenantShell tenantId={String(params.id)} title="Usuarios del tenant" description="Cargando informacion.">
        <LoadingState message="Cargando usuarios..." />
      </TenantShell>
    );
  }

  return (
    <TenantShell
      tenantId={tenant.id}
      title={`${tenant.name} · Usuarios`}
      description="Gestion de usuarios asignados al tenant."
      actions={
        <Button size="sm" asChild>
          <Link href={`/settings/users/create?tenantId=${tenant.id}`}>Crear usuario</Link>
        </Button>
      }
    >
      <TableShell
        title="Usuarios del tenant"
        description="Accesos activos y roles disponibles."
        isLoading={loading}
        isError={error}
        isEmpty={!loading && !error && data.items.length === 0}
        emptyTitle="Sin usuarios registrados"
        emptyDescription="Invita usuarios para habilitar operaciones."
      >
        <DataTable columns={columns} data={data} variant="bare" />
      </TableShell>
    </TenantShell>
  );
}
