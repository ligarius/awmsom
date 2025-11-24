"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DetailPanel } from "@/components/DetailPanel";
import { useApi } from "@/hooks/useApi";
import type { Role } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { get } = useApi();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    get<Role>(`/roles/${params.id}`)
      .then(setRole)
      .catch(() => toast({ title: "No pudimos cargar el rol", variant: "destructive" }));
  }, [get, params.id]);

  if (!role) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{role.name}</h1>
          <p className="text-sm text-muted-foreground">Detalle de permisos y asignaciones.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/settings/roles/${role.id}/edit`)}>
          Editar
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DetailPanel
          title="Rol"
          entries={[
            { label: "Descripción", value: role.description },
            { label: "Usuarios asignados", value: role.userCount ?? 0 }
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Permisos</CardTitle>
            <CardDescription>Permisos asociados a este rol.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {role.permissions.map((p) => (
              <div key={p}>• {p}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
