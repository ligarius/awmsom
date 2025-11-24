"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/FormSection";
import { useApi } from "@/hooks/useApi";
import type { TenantInput } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";

export default function CreateTenantPage() {
  const router = useRouter();
  const { post } = useApi();
  const [form, setForm] = useState<TenantInput>({
    name: "",
    taxId: "",
    email: "",
    plan: "STANDARD",
    userLimit: 10,
    operationLimit: 1000
  });

  const onSubmit = async () => {
    try {
      await post("/saas/tenants", form);
      toast({ title: "Tenant creado" });
      router.push("/saas/tenants");
    } catch (error) {
      toast({ title: "No pudimos crear el tenant", variant: "destructive" });
    }
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Crear tenant</CardTitle>
          <CardDescription>Registra el tenant y crea el usuario administrador inicial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Información básica">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Acme Logistics"
                />
              </div>
              <div>
                <Label htmlFor="taxId">RUT / Tax ID</Label>
                <Input
                  id="taxId"
                  value={form.taxId}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))}
                  placeholder="76.123.456-7"
                />
              </div>
              <div>
                <Label htmlFor="email">Email administrador</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@acme.com"
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Input
                  id="plan"
                  value={form.plan}
                  onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
                  placeholder="STANDARD | ENTERPRISE"
                />
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
                  onChange={(e) => setForm((prev) => ({ ...prev, userLimit: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="operationLimit">Operaciones</Label>
                <Input
                  id="operationLimit"
                  type="number"
                  value={form.operationLimit}
                  onChange={(e) => setForm((prev) => ({ ...prev, operationLimit: Number(e.target.value) }))}
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
            <Button onClick={onSubmit}>Crear</Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
