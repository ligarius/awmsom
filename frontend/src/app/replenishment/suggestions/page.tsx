"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { ReplenishmentSuggestion } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";

export default function ReplenishmentSuggestionsPage() {
  const { get, post } = useApi();
  const router = useRouter();
  const { canReplenishmentRead, canReplenishmentApprove, canReplenishmentExecute } = usePermissions();
  const [data, setData] = useState<PaginatedResult<ReplenishmentSuggestion>>({ items: [], page: 1, pageSize: 20, total: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "execute" | null>(null);

  useEffect(() => {
    if (!canReplenishmentRead) {
      router.replace("/forbidden");
      return;
    }
    fetchData();
  }, [canReplenishmentRead]);

  const fetchData = (page = 1) => {
    get<PaginatedResult<ReplenishmentSuggestion>>("/replenishment/suggestions", { page })
      .then(setData)
      .catch(() => toast({ title: "No pudimos cargar sugerencias", variant: "destructive" }));
  };

  const columns: ColumnDef<ReplenishmentSuggestion>[] = useMemo(
    () => [
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "productName", header: "Producto" },
      { accessorKey: "suggestedQty", header: "Cantidad" },
      { accessorKey: "sourceLocation", header: "Origen" },
      { accessorKey: "destinationLocation", header: "Destino" },
      { accessorKey: "reason", header: "Motivo" },
      {
        accessorKey: "score",
        header: "Score",
        cell: ({ row }) => <Badge variant="secondary">{row.original.score ?? "-"}</Badge>
      },
      { accessorKey: "status", header: "Estado" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {canReplenishmentApprove && row.original.status === "PENDING" && (
              <Button size="sm" onClick={() => handleAsk(row.original.id, "approve")}>Aprobar</Button>
            )}
            {canReplenishmentExecute && row.original.status !== "EXECUTED" && (
              <Button size="sm" variant="outline" onClick={() => handleAsk(row.original.id, "execute")}>
                Ejecutar
              </Button>
            )}
          </div>
        )
      }
    ],
    [canReplenishmentApprove, canReplenishmentExecute]
  );

  const handleAsk = (id: string, nextAction: "approve" | "execute") => {
    setSelectedId(id);
    setAction(nextAction);
  };

  const handleConfirm = async () => {
    if (!selectedId || !action) return;
    try {
      const url = action === "approve" ? `/replenishment/${selectedId}/approve` : `/replenishment/${selectedId}/execute`;
      await post(url);
      toast({ title: action === "approve" ? "Aprobada" : "Ejecutada" });
      fetchData(data.page);
    } catch (error) {
      toast({ title: "Error procesando la acción", variant: "destructive" });
    } finally {
      setAction(null);
      setSelectedId(null);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sugerencias de reposición</h1>
          <p className="text-sm text-muted-foreground">Aprobar y ejecutar movimientos internos.</p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Origen → destino, prioridades y políticas.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} onPageChange={fetchData} />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setSelectedId(null);
          }
        }}
        title={action === "approve" ? "¿Aprobar sugerencia?" : "¿Ejecutar reposición?"}
        description="Esto actualizará el estado y puede generar un movimiento interno."
        onConfirm={handleConfirm}
      />
    </AppShell>
  );
}
