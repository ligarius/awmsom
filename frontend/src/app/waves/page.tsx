"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { PaginatedResult } from "@/types/common";
import type { Wave } from "@/types/operations";
import { WaveStatusBadge } from "@/components/operations/WaveStatusBadge";

export default function WavesListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canWavePlan, canWaveRelease, canWaveCreate } = usePermissions();
  const { get, post } = useApi();

  useEffect(() => {
    if (!canWavePlan && !canWaveRelease && !canWaveCreate) router.replace("/forbidden");
  }, [canWaveCreate, canWavePlan, canWaveRelease, router]);

  const wavesQuery = useQuery({
    queryKey: ["waves", "list"],
    queryFn: () => get<PaginatedResult<Wave>>("/waves"),
    enabled: canWavePlan || canWaveRelease || canWaveCreate,
    onError: () => toast({ title: "No pudimos cargar waves", variant: "destructive" })
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => post(`/waves/${id}/release`),
    onSuccess: () => {
      toast({ title: "Wave liberada" });
      queryClient.invalidateQueries({ queryKey: ["waves"] });
    },
    onError: () => toast({ title: "No pudimos liberar la wave", variant: "destructive" })
  });

  const columns: ColumnDef<Wave>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => (
          <Link href={`/waves/${row.original.id}`} className="font-semibold text-primary">
            {row.original.code}
          </Link>
        )
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <WaveStatusBadge status={row.original.status} />
      },
      { accessorKey: "ordersCount", header: "Órdenes" },
      { accessorKey: "skuCount", header: "SKUs" },
      { accessorKey: "pickerName", header: "Picker" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {canWavePlan && (
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/waves/${row.original.id}/plan`}>Planificar</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/waves/${row.original.id}`}>Ver</Link>
            </Button>
            {canWaveRelease && row.original.status !== "DONE" && (
              <Button size="sm" variant="outline" onClick={() => releaseMutation.mutate(row.original.id)}>
                Liberar
              </Button>
            )}
          </div>
        )
      }
    ],
    [canWavePlan, canWaveRelease, releaseMutation]
  );

  if (!canWavePlan && !canWaveRelease && !canWaveCreate) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Wave picking</h1>
          <p className="text-sm text-muted-foreground">Agrupación y control de waves operativas.</p>
        </div>
        {canWaveCreate && (
          <Button asChild>
            <Link href="/waves/create">Crear wave</Link>
          </Button>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Waves</CardTitle>
          <CardDescription>Revisa el estado, órdenes incluidas y asignación.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={wavesQuery.data ?? { items: [], page: 1, pageSize: 20, total: 0 }} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
