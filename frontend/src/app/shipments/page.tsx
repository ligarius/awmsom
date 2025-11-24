"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data/DataTable";
import { usePermissions } from "@/hooks/usePermissions";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { WarehouseSelect } from "@/components/settings/WarehouseSelect";
import type { HandlingUnit, Shipment } from "@/types/operations";

export default function ShipmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canShipmentsRead, canShipmentsExecute } = usePermissions();
  const { get, post } = useApi();
  const [createForm, setCreateForm] = useState({
    warehouseId: "",
    carrierRef: "",
    vehicleRef: "",
    routeRef: "",
    scheduledDeparture: ""
  });
  const [shipmentToAssign, setShipmentToAssign] = useState<string>("");
  const [handlingUnitSelection, setHandlingUnitSelection] = useState<string[]>([]);

  useEffect(() => {
    if (!canShipmentsRead) router.replace("/forbidden");
  }, [canShipmentsRead, router]);

  const shipmentsQuery = useQuery({
    queryKey: ["shipments"],
    queryFn: () => get<Shipment[]>("/outbound/shipments"),
    enabled: canShipmentsRead
  });

  const handlingUnitsQuery = useQuery({
    queryKey: ["handling-units", shipmentToAssign],
    queryFn: () =>
      get<HandlingUnit[]>("/outbound/handling-units", {
        warehouseId: shipmentsQuery.data?.find((s) => s.id === shipmentToAssign)?.warehouseId
      }),
    enabled: canShipmentsRead && Boolean(shipmentToAssign),
    onSuccess: () => setHandlingUnitSelection([]),
    onError: () => toast({ title: "No pudimos cargar las handling units", variant: "destructive" })
  });

  const createShipmentMutation = useMutation({
    mutationFn: () =>
      post("/outbound/shipments", {
        warehouseId: createForm.warehouseId,
        carrierRef: createForm.carrierRef || undefined,
        vehicleRef: createForm.vehicleRef || undefined,
        routeRef: createForm.routeRef || undefined,
        scheduledDeparture: createForm.scheduledDeparture || undefined
      }),
    onSuccess: () => {
      toast({ title: "Shipment creado" });
      setCreateForm({ warehouseId: "", carrierRef: "", vehicleRef: "", routeRef: "", scheduledDeparture: "" });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
    onError: () => toast({ title: "No pudimos crear el shipment", variant: "destructive" })
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

  const assignHandlingUnitsMutation = useMutation({
    mutationFn: () =>
      post(`/outbound/shipments/${shipmentToAssign}/handling-units`, {
        handlingUnitIds: handlingUnitSelection
      }),
    onSuccess: () => {
      toast({ title: "Handling units asignadas" });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      setHandlingUnitSelection([]);
      handlingUnitsQuery.refetch();
    },
    onError: () => toast({ title: "No pudimos asignar las handling units", variant: "destructive" })
  });

  const selectedShipment = useMemo(
    () => shipmentsQuery.data?.find((shipment) => shipment.id === shipmentToAssign),
    [shipmentToAssign, shipmentsQuery.data]
  );

  const dispatchableShipments = useMemo(
    () => shipmentsQuery.data?.filter((shipment) => shipment.status !== "DISPATCHED") ?? [],
    [shipmentsQuery.data]
  );

  const handleCreateChange = (field: keyof typeof createForm, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateSubmit = () => {
    if (!createForm.warehouseId) {
      toast({ title: "Selecciona una bodega para crear el shipment", variant: "destructive" });
      return;
    }
    createShipmentMutation.mutate();
  };

  const toggleHandlingUnitSelection = (huId: string) => {
    setHandlingUnitSelection((prev) =>
      prev.includes(huId) ? prev.filter((id) => id !== huId) : [...prev, huId]
    );
  };

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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crear shipment</CardTitle>
            <CardDescription>Define la bodega y datos de transporte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Bodega</Label>
                <WarehouseSelect
                  value={createForm.warehouseId}
                  onChange={(value) => handleCreateChange("warehouseId", value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Carrier</Label>
                <Input
                  value={createForm.carrierRef}
                  onChange={(e) => handleCreateChange("carrierRef", e.target.value)}
                  placeholder="Patente o referencia"
                />
              </div>
              <div className="space-y-1">
                <Label>Vehículo</Label>
                <Input
                  value={createForm.vehicleRef}
                  onChange={(e) => handleCreateChange("vehicleRef", e.target.value)}
                  placeholder="Ej. camión 123"
                />
              </div>
              <div className="space-y-1">
                <Label>Ruta</Label>
                <Input
                  value={createForm.routeRef}
                  onChange={(e) => handleCreateChange("routeRef", e.target.value)}
                  placeholder="Ruta asignada"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Salida programada</Label>
                <Input
                  type="datetime-local"
                  value={createForm.scheduledDeparture}
                  onChange={(e) => handleCreateChange("scheduledDeparture", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateSubmit} disabled={createShipmentMutation.isLoading}>
                Crear shipment
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asignar handling units</CardTitle>
            <CardDescription>
              Selecciona un shipment y las handling units disponibles de su bodega.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Shipment</Label>
              <Select value={shipmentToAssign} onValueChange={(value) => setShipmentToAssign(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona shipment" />
                </SelectTrigger>
                <SelectContent>
                  {dispatchableShipments.map((shipment) => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      {shipment.id} - {shipment.status} (Bodega {shipment.warehouseId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedShipment ? (
                <p className="text-xs text-muted-foreground">
                  HUs filtradas por bodega {selectedShipment.warehouseId}.
                </p>
              ) : null}
            </div>

            {shipmentToAssign ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Handling units disponibles</p>
                {handlingUnitsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
                {!handlingUnitsQuery.isLoading && !handlingUnitsQuery.data?.length && (
                  <p className="text-sm text-muted-foreground">No hay handling units para asignar.</p>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  {handlingUnitsQuery.data?.map((hu) => (
                    <label key={hu.id} className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={handlingUnitSelection.includes(hu.id)}
                        onChange={() => toggleHandlingUnitSelection(hu.id)}
                      />
                      <div>
                        <p className="font-semibold">{hu.code}</p>
                        <p className="text-xs text-muted-foreground">
                          Tipo {hu.handlingUnitType} · Órdenes {new Set(hu.lines.map((line) => line.outboundOrderId)).size}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                onClick={() => assignHandlingUnitsMutation.mutate()}
                disabled={!shipmentToAssign || !handlingUnitSelection.length || assignHandlingUnitsMutation.isLoading}
              >
                Asignar a shipment
              </Button>
            </div>
          </CardContent>
        </Card>
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
