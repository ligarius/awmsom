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

export default function OnboardingCompanyPage() {
  const router = useRouter();
  const { post } = useApi();
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    logo: "",
    adminEmail: "",
    address: "",
    phone: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const validationErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      validationErrors.name = "El nombre es requerido.";
    }

    if (!form.taxId.trim()) {
      validationErrors.taxId = "El RUT / Tax ID es requerido.";
    }

    if (!form.adminEmail.trim()) {
      validationErrors.adminEmail = "El email del administrador es requerido.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      await post("/onboarding/company", form);
      toast({ title: "Datos guardados" });
      router.push("/onboarding/finish");
    } catch (error) {
      toast({
        title: "No se pudieron guardar los datos",
        description: "Revisa la información e inténtalo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
          <CardDescription>Completa la información para inicializar el tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSection title="Identidad">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre empresa</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="taxId">RUT / Tax ID</Label>
                <Input id="taxId" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
                {errors.taxId && <p className="text-sm text-destructive">{errors.taxId}</p>}
              </div>
              <div>
                <Label htmlFor="logo">Logo (URL)</Label>
                <Input id="logo" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email administrador</Label>
                <Input id="adminEmail" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
                {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail}</p>}
              </div>
            </div>
          </FormSection>
          <FormSection title="Contacto">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          </FormSection>
        </CardContent>
        <CardFooter className="justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Volver
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              Guardar y continuar
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
