"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { PickingTask } from "@/types/operations";
import { PickingStep } from "@/components/operations/PickingStep";
import { PickingLocationCard } from "@/components/operations/PickingLocationCard";

export default function PickingTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPickingExecute } = usePermissions();
  const { get, post } = useApi();
  const [pickedQty, setPickedQty] = useState(0);
  const [batch, setBatch] = useState("");

  useEffect(() => {
    if (!canPickingExecute) router.replace("/forbidden");
  }, [canPickingExecute, router]);

  const taskQuery = useQuery({
    queryKey: ["picking", "tasks", id],
    queryFn: () => get<PickingTask>(`/picking/tasks/${id}`),
    enabled: canPickingExecute,
    onSuccess: (task) => setPickedQty(task.quantity),
    onError: () => toast({ title: "No pudimos cargar la tarea", variant: "destructive" })
  });

  const completeMutation = useMutation({
    mutationFn: () => post(`/picking-tasks/${id}/complete`, { quantity: pickedQty, batch }),
    onSuccess: () => {
      toast({ title: "Tarea completada" });
      queryClient.invalidateQueries({ queryKey: ["picking", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["picking", "tasks", id] });
      router.push("/picking/tasks");
    },
    onError: () => toast({ title: "No pudimos cerrar la tarea", variant: "destructive" })
  });

  if (!canPickingExecute) return null;

  return (
    <AppShell>
      {taskQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{taskQuery.data.code}</h1>
              <p className="text-sm text-muted-foreground">
                SKU {taskQuery.data.productSku} • {taskQuery.data.productName}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Volver
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Flujo de picking</CardTitle>
                <CardDescription>Confirma cada paso con disciplina operativa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PickingStep
                  title="Ir a ubicación"
                  description={`Dirígete a ${taskQuery.data.locationCode ?? "ubicación asignada"}`}
                  status="done"
                />
                <PickingStep
                  title="Confirmar cantidad pickeada"
                  description="Valida que retiraste la cantidad exacta"
                  status={pickedQty > 0 ? "active" : "pending"}
                />
                {taskQuery.data.batch && (
                  <PickingStep
                    title="Validar lote"
                    description={`Lote requerido: ${taskQuery.data.batch}`}
                    status={batch ? "done" : "active"}
                  />
                )}
                <PickingStep
                  title="Cerrar tarea"
                  description="Confirma y libera la ubicación para el siguiente paso"
                  status="pending"
                />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <PickingLocationCard code={taskQuery.data.locationCode} hint="Optimiza el recorrido siguiendo la secuencia." />
              <Card>
                <CardHeader>
                  <CardTitle>Confirmación</CardTitle>
                  <CardDescription>Registrar cantidades y lote.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Cantidad pickeada</Label>
                    <Input type="number" min={0} value={pickedQty} onChange={(e) => setPickedQty(Number(e.target.value))} />
                  </div>
                  {taskQuery.data.batch && (
                    <div>
                      <Label>Lote</Label>
                      <Input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder={taskQuery.data.batch} />
                    </div>
                  )}
                  <Button
                    className="w-full"
                    disabled={completeMutation.isLoading}
                    onClick={() => completeMutation.mutate()}
                  >
                    {completeMutation.isLoading ? "Confirmando..." : "Confirmar tarea"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
      {!taskQuery.data && !taskQuery.isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>No encontramos la tarea</CardTitle>
            <CardDescription>Verifica el código e intenta nuevamente.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </AppShell>
  );
}
