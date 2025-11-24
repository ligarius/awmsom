"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReplenishmentPolicyConfig } from "@/types/operations";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReplenishmentPoliciesPage() {
  const { get } = useApi();
  const router = useRouter();
  const { canReplenishmentConfig } = usePermissions();
  const [policy, setPolicy] = useState<ReplenishmentPolicyConfig | null>(null);

  useEffect(() => {
    if (!canReplenishmentConfig) {
      router.replace("/forbidden");
      return;
    }
    get<ReplenishmentPolicyConfig>("/replenishment/policies")
      .then(setPolicy)
      .catch(() => toast({ title: "No pudimos cargar políticas", variant: "destructive" }));
  }, [canReplenishmentConfig, get, router]);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Políticas de reposición</h1>
          <p className="text-sm text-muted-foreground">Umbrales globales y estrategia de picking.</p>
        </div>
        <Button asChild>
          <Link href="/replenishment/policies/edit">Editar</Link>
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>MIN/MAX, safety stock y zonas de picking.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Min / Max</div>
            <div className="text-lg font-semibold">{policy?.min ?? "-"} / {policy?.max ?? "-"}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Safety stock</div>
            <div className="text-lg font-semibold">{policy?.safetyStock ?? "-"}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Estrategia</div>
            <div className="text-lg font-semibold">{policy?.pickingStrategy ?? "-"}</div>
          </div>
          <div className="rounded border p-3 md:col-span-3">
            <div className="text-xs text-muted-foreground">Zonas picking</div>
            <div className="flex flex-wrap gap-2">
              {policy?.pickingZones?.map((zone) => (
                <Badge key={zone} variant="secondary">
                  {zone}
                </Badge>
              ))}
              {!policy?.pickingZones?.length && <p className="text-sm text-muted-foreground">Sin zonas definidas.</p>}
            </div>
          </div>
          {policy?.notes && <p className="text-sm text-muted-foreground md:col-span-3">{policy.notes}</p>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
