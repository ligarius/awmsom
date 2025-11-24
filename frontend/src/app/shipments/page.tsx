"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { usePermissions } from "@/hooks/usePermissions";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { Shipment } from "@/types/operations";

export default function ShipmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canShipmentsRead, canShipmentsExecute } = usePermissions();
  const { get, post } = useApi();

  useEffect(() => {
    if (!canShipmentsRead) router.replace("/forbidden");
  }, [canShipmentsRead, router]);

  const shipmentsQuery = useQuery({
    queryKey: ["shipments"],
    queryFn: () => get<Shipment[]>("/outbound/shipments"),
    enabled: canShipmentsRead
  });

  const shipMutation = useMutation({
    mutationFn: (id: string) => post(`/outbound/shipments/${id}/dispatch`, {}),
    onSuccess: () => {
      toast({ title: "Shipment despachado" });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
    onError: () => toast({ title: "No pudimos confirmar el despacho", variant: "destructive" })
  });

  const canDispatchShipment = useCallback((shipment: Shipment) => {
    const hasHandlingUnits = (shipment.shipmentHandlingUnits?.length ?? 0) > 0;
    const isDispatchable = ["PLANNED", "LOADING"].includes(shipment.status);

    return hasHandlingUnits && isDispatchable;
  }, []);

  const columns: ColumnDef<Shipment>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "carrierRef", header: "Carrier" },
      { accessorKey: "status", header: "Estado" },
      { accessorKey: "scheduledDeparture", header: "Fecha" },
      {
        header: "Handling units",
        cell: ({ row }) => row.original.shipmentHandlingUnits?.length ?? 0
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/shipments/${row.original.id}`}>Ver</Link>
            </Button>
            {canShipmentsExecute && canDispatchShipment(row.original) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => shipMutation.mutate(row.original.id)}
                disabled={shipMutation.isLoading}
              >
                Confirmar despacho
              </Button>
            )}
          </div>
        )
      }
    ],
    [canShipmentsExecute, canDispatchShipment, shipMutation]
  );

  if (!canShipmentsRead) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Despachos</h1>
          <p className="text-sm text-muted-foreground">Control de shipments listos para salir.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <CardDescription>Estado de carga y despacho de handling units.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={{
              items: shipmentsQuery.data ?? [],
              page: 1,
              pageSize: shipmentsQuery.data?.length ?? 0 || 10,
              total: shipmentsQuery.data?.length ?? 0
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
