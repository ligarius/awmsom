"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { InboundReceiveStep } from "@/components/operations/InboundReceiveStep";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { InboundDocument } from "@/types/operations";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function InboundReceivePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canInboundExecute } = usePermissions();
  const { get } = useApi();
  const [data, setData] = useState<InboundDocument | null>(null);

  useEffect(() => {
    if (!canInboundExecute) {
      router.replace("/forbidden");
      return;
    }
    get<InboundDocument>(`/inbound/${id}`)
      .then((res) => setData(res))
      .catch(() => toast({ title: "No pudimos cargar el inbound", variant: "destructive" }));
  }, [canInboundExecute, get, id, router]);

  if (!data) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Cargando recepción</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Recepción {data.code}</h1>
        <p className="text-sm text-muted-foreground">Proveedor {data.supplier}</p>
      </div>
      <InboundReceiveStep inbound={data} onCompleted={() => router.push(`/inbound/${data.id}`)} />
    </AppShell>
  );
}
