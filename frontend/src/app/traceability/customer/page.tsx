"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { TraceabilityCard } from "@/components/analytics/TraceabilityCard";
import { TraceabilityTimeline } from "@/components/analytics/TraceabilityTimeline";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useApi } from "@/hooks/useApi";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import type { TraceabilityCustomerResponse } from "@/types/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSearch } from "lucide-react";

export default function TraceabilityCustomerPage() {
  const searchParams = useSearchParams();
  const initialCustomer = searchParams.get("id") ?? "";
  const [customer, setCustomer] = useState(initialCustomer);
  const [queryCustomer, setQueryCustomer] = useState(initialCustomer);
  const { allowed, initializing } = usePermissionGuard("REPORTS:READ");
  const { get } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["traceability-customer", queryCustomer],
    queryFn: () => get<TraceabilityCustomerResponse>(`/traceability/customer/${queryCustomer}`),
    enabled: !!queryCustomer,
    staleTime: 60_000
  });

  const ordersTimeline = data?.orders.map((o) => ({
    id: o.id,
    title: o.id,
    description: o.status,
    timestamp: o.date,
    status: o.status === "delivered" ? "success" : "info" as const
  })) ?? [];

  if (initializing || !allowed) return <LoadingSpinner message="Validando permisos..." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trazabilidad por cliente</h1>
            <p className="text-sm text-muted-foreground">Órdenes, productos enviados y OTIF por cliente.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Cliente" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            <Button onClick={() => setQueryCustomer(customer)} disabled={!customer}>
              <UserSearch className="mr-2 h-4 w-4" /> Buscar
            </Button>
          </div>
        </div>

        {!queryCustomer ? (
          <Card>
            <CardHeader>
              <CardTitle>Ingresa un cliente</CardTitle>
            </CardHeader>
          </Card>
        ) : isLoading ? (
          <LoadingSpinner message="Recuperando cliente..." />
        ) : isError ? (
          <p className="text-sm text-destructive">No pudimos recuperar la trazabilidad del cliente.</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <TraceabilityCard
                title="Resumen"
                badges={[`OTIF ${Math.round((data.otif ?? 0) * 100)}%`]}
                items={[
                  { label: "Cliente", value: data.customer },
                  { label: "Órdenes", value: data.orders.length },
                  { label: "Productos", value: data.products.length }
                ]}
              />
              <TraceabilityCard
                title="Productos enviados"
                items={data.products.map((p) => ({ label: `${p.sku} (${p.units} uds)`, value: p.batches.join(", ") }))}
              />
              <TraceabilityCard
                title="Últimas órdenes"
                items={data.orders.slice(0, 4).map((o) => ({ label: o.id, value: new Date(o.date).toLocaleString() }))}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Timeline de órdenes</CardTitle>
              </CardHeader>
              <CardContent>
                <TraceabilityTimeline items={ordersTimeline} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
