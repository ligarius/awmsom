"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { InboundDocument } from "@/types/operations";

export default function InboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canInboundRead, canInboundExecute } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<InboundDocument | null>(null);

  useEffect(() => {
    if (!canInboundRead) {
      router.replace("/forbidden");
      return;
    }
    get<InboundDocument>(`/inbound/${id}`)
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar la recepción", variant: "destructive" }));
  }, [canInboundRead, get, id, router]);

  if (!data) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Cargando recepción...</CardTitle>
            <CardDescription>Obteniendo datos del documento</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.code}</h1>
          <p className="text-sm text-muted-foreground">Proveedor {data.supplier} • Estado {data.status}</p>
        </div>
        {canInboundExecute && data.status === "CREATED" && (
          <Button onClick={() => router.push(`/inbound/${data.id}/receive`)}>Iniciar recepción</Button>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
          <CardDescription>Información clave para el operario</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Bodega</p>
            <p className="text-base font-semibold">{data.warehouseName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha esperada</p>
            <p className="text-base font-semibold">{data.expectedDate ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Creado</p>
            <p className="text-base font-semibold">{data.createdAt ? new Date(data.createdAt).toLocaleString() : "-"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Líneas</CardTitle>
          <CardDescription>Detalle de cada SKU</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {data.lines.map((line) => (
            <div key={line.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{line.productSku}</p>
                  <p className="text-sm text-muted-foreground">{line.productName}</p>
                </div>
                <div className="text-sm text-muted-foreground">UoM {line.uom}</div>
              </div>
              <div className="mt-2 grid grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Esperado</p>
                  <p className="font-semibold">{line.expectedQty}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recibido</p>
                  <p className="font-semibold">{line.receivedQty ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lote</p>
                  <p className="font-semibold">{line.batchNumber ?? "-"}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
