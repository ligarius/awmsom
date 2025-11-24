"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { InboundDocument } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

const statusOptions = ["CREATED", "IN_PROGRESS", "COMPLETED"] as const;

export default function InboundListPage() {
  const router = useRouter();
  const { canInboundRead, canInboundExecute } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<PaginatedResult<InboundDocument>>({ items: [], page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ supplier: "", status: "", from: "", to: "" });

  useEffect(() => {
    if (!canInboundRead) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<InboundDocument>>("/inbound", filters)
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar recepciones", variant: "destructive" }));
  }, [canInboundRead, filters, get, router]);

  const columns: ColumnDef<InboundDocument>[] = useMemo(
    () => [
      { accessorKey: "code", header: "Código" },
      { accessorKey: "supplier", header: "Proveedor" },
      { accessorKey: "expectedDate", header: "Fecha" },
      { accessorKey: "warehouseName", header: "Bodega" },
      { accessorKey: "status", header: "Estado" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/inbound/${row.original.id}`}>Ver</Link>
            </Button>
            {canInboundExecute && (
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/inbound/${row.original.id}/receive`}>Recibir</Link>
              </Button>
            )}
          </div>
        )
      }
    ],
    [canInboundExecute]
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recepciones</h1>
          <p className="text-sm text-muted-foreground">Control operativo de inbound</p>
        </div>
        {canInboundExecute && <Button asChild><Link href="/inbound/create">Crear recepción</Link></Button>}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refina la búsqueda por proveedor, estado o fecha.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Proveedor"
            value={filters.supplier}
            onChange={(e) => setFilters((prev) => ({ ...prev, supplier: e.target.value }))}
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
          <Input type="date" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} />
          <Input type="date" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recepciones</CardTitle>
          <CardDescription>Visualiza el estado de cada ASN o cita de recibo.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
