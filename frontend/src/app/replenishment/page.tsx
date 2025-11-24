"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReplenishmentSuggestionCard } from "@/components/replenishment/ReplenishmentSuggestionCard";
import type { PaginatedResult } from "@/types/common";
import type { ReplenishmentHistoryLine, ReplenishmentSuggestion } from "@/types/operations";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LowStockAlertRow } from "@/components/inventory/LowStockAlertRow";

export default function ReplenishmentDashboardPage() {
  const router = useRouter();
  const { get } = useApi();
  const { canReplenishmentRead, canReplenishmentApprove, canReplenishmentExecute } = usePermissions();
  const [suggestions, setSuggestions] = useState<PaginatedResult<ReplenishmentSuggestion>>({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0
  });
  const [history, setHistory] = useState<ReplenishmentHistoryLine[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    if (!canReplenishmentRead) {
      router.replace("/forbidden");
      return;
    }
    get<PaginatedResult<ReplenishmentSuggestion>>("/replenishment/suggestions", { page: 1, pageSize: 3 })
      .then(setSuggestions)
      .catch(() => toast({ title: "No pudimos cargar sugerencias", variant: "destructive" }));
    get<ReplenishmentHistoryLine[]>("/replenishment/history")
      .then(setHistory)
      .catch(() => toast({ title: "No pudimos cargar historial", variant: "destructive" }));
    get<any[]>("/inventory/low-stock")
      .then(setLowStock)
      .catch(() => setLowStock([]));
  }, [canReplenishmentRead, get, router]);

  const handleApprove = async (id: string) => {
    try {
      await get(`/replenishment/${id}/approve`);
      setSuggestions((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, status: "APPROVED" } : item))
      }));
      toast({ title: "Sugerencia aprobada" });
    } catch (error) {
      toast({ title: "No pudimos aprobar", variant: "destructive" });
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await get(`/replenishment/${id}/execute`);
      setSuggestions((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, status: "EXECUTED" } : item))
      }));
      toast({ title: "Reposición ejecutada" });
    } catch (error) {
      toast({ title: "No pudimos ejecutar", variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Replenishment</h1>
          <p className="text-sm text-muted-foreground">Motor visual y control de sugerencias</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/replenishment/suggestions">Ver sugerencias</Link>
          </Button>
          <Button asChild>
            <Link href="/replenishment/policies">Políticas</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sugerencias recientes</CardTitle>
            <CardDescription>Priorizadas según score y umbrales MIN/MAX.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {suggestions.items.map((suggestion) => (
              <ReplenishmentSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={canReplenishmentApprove ? handleApprove : undefined}
                onExecute={canReplenishmentExecute ? handleExecute : undefined}
              />
            ))}
            {!suggestions.items.length && <p className="text-sm text-muted-foreground">Sin sugerencias pendientes.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock bajo</CardTitle>
            <CardDescription>SKU en riesgo de ruptura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.slice(0, 5).map((alert) => (
              <LowStockAlertRow key={alert.sku} alert={alert} />
            ))}
            {!lowStock.length && <p className="text-sm text-muted-foreground">Sin alertas críticas.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
          <CardDescription>Reposiciones ejecutadas recientemente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <div className="font-semibold">{item.sku}</div>
                <div className="text-xs text-muted-foreground">{item.productName}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{item.quantity} u</Badge>
                <span className="text-xs text-muted-foreground">
                  {item.source} → {item.destination}
                </span>
                <span className="text-xs text-muted-foreground">{item.user}</span>
              </div>
            </div>
          ))}
          {!history.length && <p className="text-sm text-muted-foreground">Sin movimientos recientes.</p>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
