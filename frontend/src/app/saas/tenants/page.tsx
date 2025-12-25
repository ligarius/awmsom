"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import type { Tenant } from "@/types/saas";
import type { PaginatedResult } from "@/types/common";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { formatPlanLabel } from "@/lib/plans";

export default function TenantListPage() {
  const router = useRouter();
  const { get, post } = useApi();
  const [data, setData] = useState<PaginatedResult<Tenant>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    get<Tenant[] | PaginatedResult<Tenant>>("/saas/tenants")
      .then((response) => {
        if (Array.isArray(response)) {
          setData({ items: response, total: response.length, page: 1, pageSize: 10 });
        } else {
          setData(response);
        }
      })
      .catch(() => toast({ title: "No pudimos cargar los tenants", variant: "destructive" }));
  }, [get]);

  const toggleStatus = async () => {
    if (!selected) return;
    const endpoint = selected.status === "ACTIVE" ? `/saas/tenants/${selected.id}/suspend` : `/saas/tenants/${selected.id}/activate`;
    await post(endpoint);
    setDialogOpen(false);
    toast({ title: "Estado actualizado" });
    const refreshed = await get<Tenant[] | PaginatedResult<Tenant>>("/saas/tenants");
    if (Array.isArray(refreshed)) {
      setData({ items: refreshed, total: refreshed.length, page: 1, pageSize: 10 });
    } else {
      setData(refreshed);
    }
  };

  const columns: ColumnDef<Tenant>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Tenant" },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <UserStatusBadge status={row.original.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"} />
      },
      {
        accessorKey: "plan",
        header: "Plan",
        cell: ({ getValue }) => <span>{formatPlanLabel(getValue<string>())}</span>
      },
      { accessorKey: "createdAt", header: "Creado", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard?tenantId=${row.original.id}`}>Entrar como admin</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/saas/tenants/${row.original.id}/processes`}>Operaciones</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/saas/tenants/${row.original.id}`}>Ver</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/saas/tenants/${row.original.id}/edit`}>Editar</Link>
            </Button>
            <Button
              variant={row.original.status === "ACTIVE" ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                setSelected(row.original);
                setDialogOpen(true);
              }}
            >
              {row.original.status === "ACTIVE" ? "Suspender" : "Activar"}
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
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">Administra la flota completa de tenants del SaaS.</p>
        </div>
        <Button onClick={() => router.push("/saas/tenants/create")}>Crear tenant</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Estados, planes y fechas de alta.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${selected?.status === "ACTIVE" ? "Suspender" : "Reactivar"} tenant`}
        description={`Confirma que deseas ${selected?.status === "ACTIVE" ? "suspender" : "activar"} ${selected?.name}.`}
        onConfirm={toggleStatus}
        confirmLabel={selected?.status === "ACTIVE" ? "Suspender" : "Activar"}
      />
    </AppShell>
  );
}
