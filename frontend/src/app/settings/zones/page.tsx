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
import type { Zone } from "@/types/wms";
import { WarehouseSelect } from "@/components/settings/WarehouseSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { usePermissions } from "@/hooks/usePermissions";

const zoneTypes = ["RECEIVING", "STORAGE", "PICKING", "SHIPPING", "RETURNS"];

export default function ZonesPage() {
  const router = useRouter();
  const { get } = useApi();
  const { canReadWmsConfig, canWriteWmsConfig } = usePermissions();
  const [data, setData] = useState<PaginatedResult<Zone>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [filters, setFilters] = useState<{ warehouseId?: string; zoneType?: string; status?: string; search?: string }>({});

  useEffect(() => {
    if (!canReadWmsConfig) return;
    get<Zone[] | PaginatedResult<Zone>>("/zones")
      .then((response) => {
        const normalized: PaginatedResult<Zone> = Array.isArray(response)
          ? { items: response, total: response.length, page: 1, pageSize: 20 }
          : response;
        setData({ ...normalized, items: applyFilters(normalized.items, filters) });
      })
      .catch(() => toast({ title: "No pudimos cargar las zonas", variant: "destructive" }));
  }, [canReadWmsConfig, filters, get]);

  const columns: ColumnDef<Zone>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "code", header: "Código" },
      { accessorKey: "warehouseName", header: "Bodega" },
      { accessorKey: "zoneType", header: "Tipo" },
      { header: "Activa", cell: ({ row }) => (row.original.isActive ? "Sí" : "No") },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/zones/${row.original.id}/edit`}>Editar</Link>
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
        title="Zonas"
        description="Configura las zonas operativas dentro de cada bodega"
        actions={canWriteWmsConfig ? <Button onClick={() => router.push("/settings/zones/create")}>Crear zona</Button> : null}
      />
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Gestiona zonas por bodega y tipo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <WarehouseSelect
              placeholder="Filtrar por bodega"
              value={filters.warehouseId}
              onChange={(value) => setFilters((prev) => ({ ...prev, warehouseId: value }))}
            />
            <Select
              value={filters.zoneType}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, zoneType: value || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {zoneTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value || undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por nombre o código"
              value={filters.search ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </AppShell>
  );
}

function applyFilters(items: Zone[], filters: { warehouseId?: string; zoneType?: string; status?: string; search?: string }) {
  return items.filter((item) => {
    if (filters.warehouseId && item.warehouseId !== filters.warehouseId) return false;
    if (filters.zoneType && item.zoneType !== filters.zoneType) return false;
    if (filters.status === "active" && !item.isActive) return false;
    if (filters.status === "inactive" && item.isActive) return false;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      if (!`${item.name} ${item.code}`.toLowerCase().includes(term)) return false;
    }
    return true;
  });
}
