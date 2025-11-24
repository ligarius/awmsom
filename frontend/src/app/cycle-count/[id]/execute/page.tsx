"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { CycleCountDocument, CycleCountTaskLine } from "@/types/operations";
import { CycleCountTaskList } from "@/components/operations/CycleCountTaskList";
import { CycleCountReview } from "@/components/operations/CycleCountReview";

export default function CycleCountExecutePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canCycleCountExecute } = usePermissions();
  const { get, post } = useApi();
  const [doc, setDoc] = useState<CycleCountDocument | null>(null);
  const [lines, setLines] = useState<CycleCountTaskLine[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canCycleCountExecute) {
      router.replace("/forbidden");
      return;
    }
    get<CycleCountDocument>(`/cycle-count/${id}`)
      .then((res) => {
        setDoc(res);
        setLines(res.lines);
      })
      .catch(() => toast({ title: "No pudimos cargar el conteo", variant: "destructive" }));
  }, [canCycleCountExecute, get, id, router]);

  const handleSendCounts = async () => {
    setLoading(true);
    try {
      await post(`/cycle-count/${id}/execute`, { lines });
      toast({ title: "Conteo enviado", description: "Revisa las diferencias" });
      setReviewMode(true);
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos registrar el conteo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    setLoading(true);
    try {
      await post(`/cycle-count/${id}/review`, { approve });
      toast({ title: approve ? "Ajustes aprobados" : "Diferencias rechazadas" });
      router.push(`/cycle-count/${id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos cerrar la revisión", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!doc) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Preparando ejecución...</CardTitle>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ejecutar conteo {doc.code}</h1>
          <p className="text-sm text-muted-foreground">{doc.warehouseName}</p>
        </div>
        {!reviewMode && (
          <Button onClick={handleSendCounts} disabled={loading}>
            {loading ? "Enviando..." : "Enviar conteo"}
          </Button>
        )}
      </div>

      {!reviewMode && <CycleCountTaskList lines={lines} onUpdate={setLines} />}

      {reviewMode && (
        <CycleCountReview
          lines={lines}
          onApprove={() => handleReview(true)}
          onReject={() => handleReview(false)}
        />
      )}
    </AppShell>
  );
}
