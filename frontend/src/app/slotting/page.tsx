"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { SlottingConfigForm } from "@/components/slotting/SlottingConfigForm";
import { SlottingRecommendationCard } from "@/components/slotting/SlottingRecommendationCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/use-toast";
import type { SlottingConfig, SlottingRecommendation } from "@/types/operations";

type SlottingConfigRecord = SlottingConfig & { id: string };

export default function SlottingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { get, post, patch } = useApi();
  const { canSlottingRead, canSlottingApprove, canSlottingExecute, canSlottingConfig } = usePermissions();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!canSlottingRead && !canSlottingConfig) {
      router.replace("/forbidden");
    }
  }, [canSlottingConfig, canSlottingRead, router]);

  const configQuery = useQuery({
    queryKey: ["slotting", "config"],
    queryFn: () => get<SlottingConfigRecord[]>("/slotting/config"),
    enabled: canSlottingConfig,
    onError: () => toast({ title: "No pudimos cargar la configuración", variant: "destructive" })
  });

  const recommendationsQuery = useQuery({
    queryKey: ["slotting", "recommendations"],
    queryFn: () => get<SlottingRecommendation[]>("/slotting/recommendations"),
    enabled: canSlottingRead,
    onError: () => toast({ title: "No pudimos cargar recomendaciones", variant: "destructive" })
  });

  const configMutation = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: SlottingConfig }) => {
      if (id) return patch(`/slotting/config/${id}`, values);
      return post("/slotting/config", values);
    },
    onSuccess: () => {
      toast({ title: "Configuración guardada" });
      queryClient.invalidateQueries({ queryKey: ["slotting", "config"] });
    },
    onError: () => toast({ title: "No pudimos guardar la configuración", variant: "destructive" })
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => post(`/slotting/recommendations/${id}/approve`),
    onSuccess: () => {
      toast({ title: "Recomendación aprobada" });
      queryClient.invalidateQueries({ queryKey: ["slotting", "recommendations"] });
    },
    onError: () => toast({ title: "No pudimos aprobar", variant: "destructive" })
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => post(`/slotting/recommendations/${id}/execute`),
    onSuccess: () => {
      toast({ title: "Recomendación ejecutada" });
      queryClient.invalidateQueries({ queryKey: ["slotting", "recommendations"] });
    },
    onError: () => toast({ title: "No pudimos ejecutar", variant: "destructive" })
  });

  const config = configQuery.data?.[0];
  const recommendations = recommendationsQuery.data ?? [];

  const handleSaveConfig = (values: SlottingConfig) => {
    configMutation.mutate({ id: config?.id, values });
  };

  const handleApprove = (id: string) => {
    setActiveActionId(id);
    approveMutation.mutate(id, { onSettled: () => setActiveActionId(null) });
  };

  const handleExecute = (id: string) => {
    setActiveActionId(id);
    executeMutation.mutate(id, { onSettled: () => setActiveActionId(null) });
  };

  if (!canSlottingRead && !canSlottingConfig) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Slotting</h1>
          <p className="text-sm text-muted-foreground">Configura parámetros y actúa sobre recomendaciones.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {canSlottingConfig && (
          <SlottingConfigForm
            key={config?.id ?? "new"}
            defaultValues={config}
            onSubmit={handleSaveConfig}
            loading={configQuery.isLoading || configMutation.isPending}
          />
        )}

        {canSlottingRead && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recomendaciones</CardTitle>
              <CardDescription>Aprueba o ejecuta las propuestas de reubicación.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map((rec) => (
                  <SlottingRecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onApprove={canSlottingApprove ? handleApprove : undefined}
                    onExecute={canSlottingExecute ? handleExecute : undefined}
                    disabled={activeActionId === rec.id && (approveMutation.isPending || executeMutation.isPending)}
                  />
                ))}
                {!recommendations.length && <p className="text-sm text-muted-foreground">Sin recomendaciones disponibles.</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
