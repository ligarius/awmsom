"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/FormSection";
import { useApi } from "@/hooks/useApi";
import type { Tenant, TenantInput } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";
import { PLAN_OPTIONS } from "@/lib/plans";

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const { get, patch } = useApi();
  const [form, setForm] = useState<TenantInput | null>(null);

  useEffect(() => {
    get<Tenant>(`/saas/tenants/${params.id}`)
      .then((tenant) =>
        setForm({
          name: tenant.name,
          taxId: tenant.taxId,
          email: tenant.email,
          plan: tenant.plan,
          userLimit: tenant.userLimit,
          operationLimit: tenant.operationLimit
        })
      )
      .catch(() => toast({ title: "No pudimos cargar el tenant", variant: "destructive" }));
  }, [get, params.id]);

  const onSubmit = async () => {
    if (!form) return;
    await patch(`/saas/tenants/${params.id}`, form);
    toast({ title: "Tenant actualizado" });
    router.push(`/saas/tenants/${params.id}`);
  };

  if (!form) return null;

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Editar tenant</CardTitle>
          <CardDescription>Actualiza plan, límites y datos base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Información básica">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="taxId">RUT / Tax ID</Label>
                <Input id="taxId" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email administrador</Label>
                <Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select value={form.plan} onValueChange={(value) => setForm({ ...form, plan: value })}>
                  <SelectTrigger id="plan">
                    <SelectValue placeholder="Selecciona un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} ({option.description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>
          <FormSection title="Límites">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="userLimit">Usuarios</Label>
                <Input
                  id="userLimit"
                  type="number"
                  value={form.userLimit}
                  onChange={(e) => setForm({ ...form, userLimit: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="operationLimit">Operaciones</Label>
                <Input
                  id="operationLimit"
                  type="number"
                  value={form.operationLimit}
                  onChange={(e) => setForm({ ...form, operationLimit: Number(e.target.value) })}
                />
              </div>
            </div>
          </FormSection>
        </CardContent>
        <CardFooter className="justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={onSubmit}>Guardar</Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
