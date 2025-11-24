"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { Warehouse } from "@/types/wms";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { usePermissions } from "@/hooks/usePermissions";

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { get } = useApi();
  const { canReadWmsConfig } = usePermissions();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    if (!canReadWmsConfig) return;
    get<Warehouse>(`/warehouses/${params?.id}`)
      .then(setWarehouse)
      .catch(() => toast({ title: "No pudimos cargar la bodega", variant: "destructive" }));
  }, [canReadWmsConfig, get, params?.id]);

  if (!canReadWmsConfig) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>No tienes permisos para ver esta bodega.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader
        title={warehouse?.name ?? "Bodega"}
        description={warehouse?.code}
        backTo="/settings/warehouses"
        actions={<Button onClick={() => router.push(`/settings/warehouses/${params?.id}/edit`)}>Editar</Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
          <CardDescription>Datos principales de la bodega.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Info label="Código" value={warehouse?.code} />
          <Info label="Estado" value={warehouse?.isActive ? "Activa" : "Inactiva"} />
          <Info label="País" value={warehouse?.country} />
          <Info label="Ciudad" value={warehouse?.city} />
          <Info label="Dirección" value={warehouse?.address} />
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}
