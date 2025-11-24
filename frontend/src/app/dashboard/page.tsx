"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/providers/AuthProvider";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { CheckCircle2, Clock3, Network } from "lucide-react";

const kpiCards = [
  { title: "Órdenes en curso", value: "12", icon: Clock3, hint: "Consolida inbound/outbound en FE2" },
  { title: "Tareas completadas", value: "124", icon: CheckCircle2, hint: "Pendiente integrar task board" },
  { title: "Integraciones", value: "3", icon: Network, hint: "WMS ↔ ERP/OMS en FE4" }
];

export default function DashboardPage() {
  const { user, initializing } = useAuthContext();

  if (initializing) {
    return <LoadingSpinner message="Verificando sesión..." />;
  }

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bienvenido, {user?.fullName ?? "operador"}</CardTitle>
            <CardDescription>
              Este dashboard será el hub de control del WMS. En los siguientes sprints agregaremos KPIs en vivo y un timeline de
              operaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">Tenant</div>
                <div className="text-xl font-semibold">{user?.tenant ?? "No asignado"}</div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">Rol</div>
                <div className="text-xl font-semibold">{user?.role ?? "Pendiente de rol"}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Próximas acciones: definir rutas protegidas por rol, agregar selección de tenant y persistencia de tema en sprint FE2.
            </p>
            <Button variant="outline">Explorar roadmap FE</Button>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{kpi.title}</CardTitle>
                  <CardDescription>{kpi.hint}</CardDescription>
                </div>
                <kpi.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
