"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DetailPanel } from "@/components/DetailPanel";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { useApi } from "@/hooks/useApi";
import type { TenantUser } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");
  const { get } = useApi();
  const [user, setUser] = useState<TenantUser | null>(null);

  useEffect(() => {
    get<TenantUser>(`/users/${params.id}`)
      .then(setUser)
      .catch(() => toast({ title: "No pudimos cargar el usuario", variant: "destructive" }));
  }, [get, params.id]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.fullName}</h1>
          <p className="text-sm text-muted-foreground">Detalle del usuario, roles y permisos derivados.</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            router.push(tenantId ? `/settings/users/${user.id}/edit?tenantId=${tenantId}` : `/settings/users/${user.id}/edit`)
          }
        >
          Editar
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DetailPanel
          title="Perfil"
          entries={[
            { label: "Email", value: user.email },
            { label: "Rol", value: user.role },
            { label: "Estado", value: <UserStatusBadge status={user.status} /> },
            { label: "Creado", value: new Date(user.createdAt).toLocaleString() },
            { label: "Último login", value: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Nunca" }
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Permisos</CardTitle>
            <CardDescription>Permisos derivados del rol.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {user.permissions?.length ? user.permissions.map((p) => <div key={p}>• {p}</div>) : <p>Sin permisos asignados</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
