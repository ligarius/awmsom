"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { CycleCountDocument } from "@/types/operations";

export default function CycleCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCycleCountCreate, canCycleCountExecute } = usePermissions();
  const { get } = useApi();
  const [doc, setDoc] = useState<CycleCountDocument | null>(null);

  useEffect(() => {
    if (!canCycleCountCreate) {
      router.replace("/forbidden");
      return;
    }
    get<CycleCountDocument>(`/cycle-count/${id}`)
      .then((res) => setDoc(res))
      .catch(() => toast({ title: "No pudimos cargar el conteo", variant: "destructive" }));
  }, [canCycleCountCreate, get, id, router]);

  if (!doc) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Cargando conteo...</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conteo {doc.code}</h1>
          <p className="text-sm text-muted-foreground">Estado {doc.status}</p>
        </div>
        {canCycleCountExecute && (
          <Button onClick={() => router.push(`/cycle-count/${doc.id}/execute`)}>Ejecutar conteo</Button>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Alcance</CardTitle>
          <CardDescription>Zonas y ubicaciones</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Bodega</p>
            <p className="font-semibold">{doc.warehouseName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Zonas</p>
            <p className="font-semibold">{doc.zones?.join(", ") ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuario asignado</p>
            <p className="font-semibold">{doc.assignedTo ?? "Sin asignar"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Líneas del conteo</CardTitle>
          <CardDescription>Ubicaciones y stock teórico</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {doc.lines.map((line) => (
            <div key={`${line.location}-${line.sku}`} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{line.location}</p>
                  <p className="text-sm text-muted-foreground">{line.productName ?? line.sku}</p>
                </div>
                <p className="text-sm text-muted-foreground">Teórico {line.theoretical}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
