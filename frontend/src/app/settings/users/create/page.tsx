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
import { toast } from "@/components/ui/use-toast";

export default function CreateUserPage() {
  const router = useRouter();
  const { post } = useApi();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "USER" });

  const onSubmit = async () => {
    await post("/users", form);
    toast({ title: "Usuario creado" });
    router.push("/settings/users");
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Crear usuario</CardTitle>
          <CardDescription>Define credenciales iniciales y rol asignado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Información básica">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Nombre</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="password">Contraseña temporal</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Rol</Label>
                <Input id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
            </div>
          </FormSection>
        </CardContent>
        <CardFooter className="justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={onSubmit}>Crear usuario</Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
