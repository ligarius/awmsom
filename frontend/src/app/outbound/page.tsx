"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { PaginatedResult } from "@/types/common";
import type { OutboundOrder } from "@/types/operations";
import { OutboundStatusBadge } from "@/components/operations/OutboundStatusBadge";

const statusOptions = ["CREATED", "RELEASED", "PICKING", "PACKED", "SHIPPED"] as const;

export default function OutboundListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canOutboundRead, canOutboundCreate, canOutboundRelease } = usePermissions();
  const { get, post } = useApi();
  const [filters, setFilters] = useState({ client: "", status: "", commitmentDate: "" });

  useEffect(() => {
    if (!canOutboundRead) {
      router.replace("/forbidden");
    }
  }, [canOutboundRead, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["outbound", filters],
    queryFn: () => get<PaginatedResult<OutboundOrder>>("/outbound", filters),
    enabled: canOutboundRead
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => post(`/outbound/${id}/release`),
    onSuccess: () => {
      toast({ title: "Orden liberada" });
      queryClient.invalidateQueries({ queryKey: ["outbound"] });
    },
    onError: () => toast({ title: "No se pudo liberar", variant: "destructive" })
  });

  const columns: ColumnDef<OutboundOrder>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => (
          <Link href={`/outbound/${row.original.id}`} className="font-semibold text-primary">
            {row.original.code}
          </Link>
        )
      },
      { accessorKey: "client", header: "Cliente" },
      { accessorKey: "commitmentDate", header: "Fecha compromiso" },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <OutboundStatusBadge status={row.original.status} />
      },
      {
        id: "lines",
        header: "Líneas",
        cell: ({ row }) => row.original.lines.length
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/outbound/${row.original.id}`}>Ver</Link>
            </Button>
            {canOutboundRelease && row.original.status === "CREATED" && (
              <Button size="sm" variant="outline" onClick={() => releaseMutation.mutate(row.original.id)} disabled={releaseMutation.isLoading}>
                Liberar
              </Button>
            )}
          </div>
        )
      }
    ],
    [canOutboundRelease, releaseMutation]
  );

  if (!canOutboundRead) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Órdenes de salida</h1>
          <p className="text-sm text-muted-foreground">Gestiona el ciclo completo de outbound</p>
        </div>
        {canOutboundCreate && (
          <Button asChild>
            <Link href="/outbound/create">Crear orden</Link>
          </Button>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra por cliente, estado o fecha compromiso.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Cliente"
            value={filters.client}
            onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
          />
          <Select value={filters.status} onValueChange={(status) => setFilters((prev) => ({ ...prev, status }))}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.commitmentDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, commitmentDate: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Órdenes</CardTitle>
          <CardDescription>Lista de todas las órdenes de salida con su estado operativo.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data ?? { items: [], page: 1, pageSize: 20, total: 0 }} />
          {isLoading && <p className="mt-2 text-sm text-muted-foreground">Cargando órdenes...</p>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
