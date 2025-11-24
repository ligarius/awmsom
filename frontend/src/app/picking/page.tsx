"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { PickingTaskCard } from "@/components/operations/PickingTaskCard";
import type { OutboundOrder, PickingTask, Wave } from "@/types/operations";
import { toast } from "@/components/ui/use-toast";

export default function PickingDashboardPage() {
  const router = useRouter();
  const { canPickingRead, canPickingExecute } = usePermissions();
  const { get } = useApi();

  useEffect(() => {
    if (!canPickingRead) router.replace("/forbidden");
  }, [canPickingRead, router]);

  const tasksQuery = useQuery({
    queryKey: ["picking", "tasks"],
    queryFn: () => get<PickingTask[]>("/picking/tasks"),
    enabled: canPickingRead,
    onError: () => toast({ title: "No pudimos cargar tareas", variant: "destructive" })
  });

  const wavesQuery = useQuery({
    queryKey: ["waves"],
    queryFn: () => get<Wave[]>("/waves"),
    enabled: canPickingRead,
    onError: () => toast({ title: "No pudimos cargar waves", variant: "destructive" })
  });

  const outboundQuery = useQuery({
    queryKey: ["outbound", "ready"],
    queryFn: () => get<OutboundOrder[]>("/outbound/orders"),
    enabled: canPickingRead,
    onError: () => toast({ title: "No pudimos cargar outbound", variant: "destructive" })
  });

  const pendingRelease = outboundQuery.data?.filter((o) => o.status === "DRAFT").length ?? 0;
  const readyToPick = outboundQuery.data?.filter((o) => o.status === "RELEASED").length ?? 0;
  const wavesOpen = wavesQuery.data?.filter((w) => w.status !== "DONE").length ?? 0;
  const myTasks = tasksQuery.data ?? [];

  if (!canPickingRead) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Picking operativo</h1>
          <p className="text-sm text-muted-foreground">Visibilidad inmediata de órdenes, waves y tareas.</p>
        </div>
        {canPickingExecute && (
          <Button asChild>
            <Link href="/picking/tasks">Ver mis tareas</Link>
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Órdenes esperando release</CardDescription>
            <CardTitle>{pendingRelease}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Órdenes listas para pickear</CardDescription>
            <CardTitle>{readyToPick}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Waves abiertas</CardDescription>
            <CardTitle>{wavesOpen}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tareas asignadas</CardDescription>
            <CardTitle>{myTasks.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Tareas por usuario</CardTitle>
            <CardDescription>Lista solo de tus tareas activas</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/picking/tasks">Gestionar tareas</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {myTasks.map((task) => (
              <PickingTaskCard
                key={task.id}
                task={task}
                actionSlot={
                  <Button size="sm" asChild>
                    <Link href={`/picking/tasks/${task.id}`}>Abrir</Link>
                  </Button>
                }
              />
            ))}
            {!myTasks.length && <p className="text-sm text-muted-foreground">No tienes tareas asignadas.</p>}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
