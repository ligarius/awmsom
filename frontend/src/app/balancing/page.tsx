"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { TransferOrder, TransferOrderStatus, WarehouseBalancePlan } from "@/types/operations";
import type { Warehouse } from "@/types/wms";
import { usePermissions } from "@/hooks/usePermissions";
import { WarehouseSelect } from "@/components/settings/WarehouseSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusOptions: TransferOrderStatus[] = ["CREATED", "APPROVED", "RELEASED", "COMPLETED", "CANCELLED"];

export default function BalancingPage() {
  const router = useRouter();
  const { get, post } = useApi();
  const { canInventoryAdvancedRead, canReplenishmentApprove, canReplenishmentExecute } = usePermissions();

  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filters, setFilters] = useState<{ source?: string; destination?: string; status?: TransferOrderStatus | "" }>({
    status: ""
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "execute" } | null>(null);
  const [impactOrder, setImpactOrder] = useState<TransferOrder | null>(null);
  const [impactPlans, setImpactPlans] = useState<WarehouseBalancePlan[]>([]);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => {
    if (!canInventoryAdvancedRead) {
      router.replace("/forbidden");
      return;
    }
    loadOrders();
    loadWarehouses();
  }, [canInventoryAdvancedRead, get, router]);

  const loadOrders = () => {
    get<TransferOrder[]>("/replenishment/transfer-orders")
      .then((items) => setOrders(items))
      .catch(() => toast({ title: "No pudimos cargar balanceos", variant: "destructive" }));
  };

  const loadWarehouses = () => {
    get<Warehouse[]>("/warehouses")
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  };

  const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name ?? id ?? "-";

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.source && order.sourceWarehouseId !== filters.source) return false;
      if (filters.destination && order.destinationWarehouseId !== filters.destination) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(term);
        const matchesLine = order.lines.some(
          (line) => line.productSku?.toLowerCase().includes(term) || line.productId.toLowerCase().includes(term)
        );
        if (!matchesId && !matchesLine) return false;
      }
      return true;
    });
  }, [filters.destination, filters.source, filters.status, orders, searchTerm]);

  const tableData: PaginatedResult<TransferOrder> = {
    items: filteredOrders,
    page: 1,
    pageSize: filteredOrders.length || 1,
    total: filteredOrders.length
  };

  const openImpact = async (order: TransferOrder) => {
    setImpactOrder(order);
    setImpactLoading(true);
    try {
      const plans = await Promise.all(
        order.lines.map((line) =>
          post<WarehouseBalancePlan>("/inventory/warehouses/balance", {
            productId: line.productId,
            sourceWarehouseId: order.sourceWarehouseId,
            targetWarehouseId: order.destinationWarehouseId,
            quantity: line.quantity,
            uom: line.uom ?? "EA",
            respectCapacity: true
          })
        )
      );
      setImpactPlans(plans);
    } catch (error) {
      toast({ title: "No pudimos calcular el impacto", variant: "destructive" });
      setImpactPlans([]);
    } finally {
      setImpactLoading(false);
    }
  };

  const columns: ColumnDef<TransferOrder>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      {
        header: "Origen",
        accessorKey: "sourceWarehouseId",
        cell: ({ row }) => warehouseName(row.original.sourceWarehouseId)
      },
      {
        header: "Destino",
        accessorKey: "destinationWarehouseId",
        cell: ({ row }) => warehouseName(row.original.destinationWarehouseId)
      },
      {
        header: "Líneas",
        cell: ({ row }) => row.original.lines.length
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>
      },
      {
        id: "impact",
        header: "Capacidad",
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => openImpact(row.original)}>
            Ver impacto
          </Button>
        )
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {canReplenishmentApprove && row.original.status === "CREATED" && (
              <Button size="sm" onClick={() => setConfirmAction({ id: row.original.id, action: "approve" })}>
                Aprobar
              </Button>
            )}
            {canReplenishmentExecute && row.original.status !== "COMPLETED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction({ id: row.original.id, action: "execute" })}
              >
                Ejecutar
              </Button>
            )}
          </div>
        )
      }
    ],
    [canReplenishmentApprove, canReplenishmentExecute, warehouseName]
  );

  const runAction = async () => {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    try {
      const url = action === "approve" ? `/replenishment/transfer-orders/${id}/approve` : `/replenishment/transfer-orders/${id}/execute`;
      await post(url);
      toast({ title: action === "approve" ? "Transferencia aprobada" : "Transferencia ejecutada" });
      loadOrders();
    } catch (error) {
      toast({ title: "No pudimos procesar la acción", variant: "destructive" });
    } finally {
      setConfirmAction(null);
    }
  };

  if (!canInventoryAdvancedRead) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Balanceo entre bodegas</h1>
          <p className="text-sm text-muted-foreground">Sugerencias y órdenes de transferencia para nivelar inventario.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Limita por bodega origen/destino, estado o SKU.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <WarehouseSelect
            value={filters.source}
            onChange={(source) => setFilters((prev) => ({ ...prev, source }))}
            placeholder="Bodega origen"
          />
          <WarehouseSelect
            value={filters.destination}
            onChange={(destination) => setFilters((prev) => ({ ...prev, destination }))}
            placeholder="Bodega destino"
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
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Transferencias y balanceo</CardTitle>
          <CardDescription>Acciona sobre sugerencias y consulta su impacto en capacidad.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tableData}
            onFilterChange={(term) => setSearchTerm(term)}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmAction?.action === "approve" ? "¿Aprobar transferencia?" : "¿Ejecutar balanceo?"}
        description="Se actualizará el estado y se generarán los movimientos asociados."
        onConfirm={runAction}
      />

      <Dialog open={Boolean(impactOrder)} onOpenChange={(open) => !open && setImpactOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impacto en capacidad</DialogTitle>
            <DialogDescription>
              {impactOrder
                ? `${warehouseName(impactOrder.sourceWarehouseId)} → ${warehouseName(impactOrder.destinationWarehouseId)}`
                : "Balanceo"}
            </DialogDescription>
          </DialogHeader>
          {impactLoading && <p className="text-sm text-muted-foreground">Calculando impacto...</p>}
          {!impactLoading && !impactPlans.length && (
            <p className="text-sm text-muted-foreground">Sin datos de capacidad disponibles.</p>
          )}
          {!impactLoading && impactPlans.length > 0 && (
            <div className="space-y-3">
              {impactPlans.map((plan, index) => (
                <div key={`${plan.productId}-${index}`} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Producto {plan.productId}</div>
                    <Badge variant={plan.requiresTransferOrder ? "default" : "secondary"}>
                      {plan.requiresTransferOrder ? "Requiere transferencia" : "Movimiento interno"}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>
                      Cantidad: <span className="font-medium text-foreground">{plan.quantity}</span> {plan.uom}
                    </div>
                    <div>
                      Disponibilidad origen: {plan.validations?.availableAtSource ?? "-"}
                    </div>
                    <div>
                      Destino con zona de storage: {plan.validations?.targetHasStorageZone ? "Sí" : "No"}
                    </div>
                    <div>
                      Ubicaciones: {plan.fromLocationId ?? "-"} → {plan.toLocationId ?? "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
