"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FilterBarAdvanced } from "@/components/analytics/FilterBarAdvanced";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { Search, Target } from "lucide-react";

export default function TraceabilityHomePage() {
  const { allowed, initializing } = usePermissionGuard("TRACEABILITY_READ");
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [batch, setBatch] = useState("");
  const [order, setOrder] = useState("");
  const [customer, setCustomer] = useState("");

  if (initializing || !allowed) return <LoadingSpinner message="Validando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trazabilidad avanzada</h1>
            <p className="text-sm text-muted-foreground">Consulta por SKU, lote, cliente, orden o rango de fechas.</p>
          </div>
          <Button variant="outline" onClick={() => router.refresh()}>
            <Search className="mr-2 h-4 w-4" /> Reiniciar búsqueda
          </Button>
        </div>

        <FilterBarAdvanced storageKey="traceability-filters" onChange={() => null} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Por SKU</CardTitle>
              <CardDescription>Rastrear movimientos y lotes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
              <Button className="w-full" onClick={() => router.push(`/traceability/product?sku=${sku}`)} disabled={!sku}>
                Ver SKU
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por lote</CardTitle>
              <CardDescription>Recepción y consumos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Lote" value={batch} onChange={(e) => setBatch(e.target.value)} />
              <Button className="w-full" onClick={() => router.push(`/traceability/batch?batch=${batch}`)} disabled={!batch}>
                Ver lote
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por cliente</CardTitle>
              <CardDescription>Órdenes y cumplimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Cliente" value={customer} onChange={(e) => setCustomer(e.target.value)} />
              <Button className="w-full" onClick={() => router.push(`/traceability/customer?id=${customer}`)} disabled={!customer}>
                Ver cliente
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por orden</CardTitle>
              <CardDescription>Detalle completo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="ID de orden" value={order} onChange={(e) => setOrder(e.target.value)} />
              <Button className="w-full" onClick={() => router.push(`/traceability/order/${order}`)} disabled={!order}>
                Ver orden
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Target className="h-4 w-4" /> También puedes navegar a movimientos específicos si tienes el ID:
            <Link className="font-semibold text-primary" href="/traceability/movement/demo-move">
              /traceability/movement/&lt;id&gt;
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
