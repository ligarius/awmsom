"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import type { Tenant, TenantUser } from "@/types/saas";
import { DetailPanel } from "@/components/DetailPanel";
import { TenantPlanCard } from "@/components/TenantPlanCard";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { get, post } = useApi();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    const tenantResponse = await get<Tenant>(`/saas/tenants/${params.id}`);
    setTenant(tenantResponse);
    const userResponse = await get<TenantUser[] | { items: TenantUser[] }>(`/saas/tenants/${params.id}/users`).catch(() => [] as TenantUser[]);
    if (Array.isArray(userResponse)) setUsers(userResponse);
    else setUsers(userResponse.items);
  };

  useEffect(() => {
    load().catch(() => toast({ title: "No pudimos cargar el tenant", variant: "destructive" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const toggleStatus = async () => {
    if (!tenant) return;
    const endpoint = tenant.status === "ACTIVE" ? `/saas/tenants/${tenant.id}/suspend` : `/saas/tenants/${tenant.id}/activate`;
    await post(endpoint);
    toast({ title: "Estado actualizado" });
    setDialogOpen(false);
    load();
  };

  if (!tenant) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">Detalle completo del tenant.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/saas/tenants/${tenant.id}/edit`)}>
            Editar
          </Button>
          <Button variant={tenant.status === "ACTIVE" ? "destructive" : "default"} onClick={() => setDialogOpen(true)}>
            {tenant.status === "ACTIVE" ? "Suspender" : "Activar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información</CardTitle>
            <CardDescription>Plan, límites y estado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DetailPanel
              title="Datos base"
              entries={[
                { label: "Tax ID", value: tenant.taxId },
                { label: "Email", value: tenant.email },
                { label: "Estado", value: <UserStatusBadge status={tenant.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"} /> },
                { label: "Creado", value: new Date(tenant.createdAt).toLocaleString() }
              ]}
            />
            <TenantPlanCard
              plan={tenant.plan}
              userLimit={tenant.userLimit}
              operationLimit={tenant.operationLimit}
              onChangePlan={() => router.push(`/saas/tenants/${tenant.id}/edit`)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Usuarios registrados en el tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
                <div>
                  <div className="font-semibold">{user.fullName}</div>
                  <div className="text-muted-foreground">{user.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{user.role}</div>
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${tenant.status === "ACTIVE" ? "Suspender" : "Activar"} tenant`}
        description="Esta acción afecta el acceso de todos los usuarios del tenant."
        onConfirm={toggleStatus}
        confirmLabel={tenant.status === "ACTIVE" ? "Suspender" : "Activar"}
      />
    </AppShell>
  );
}
