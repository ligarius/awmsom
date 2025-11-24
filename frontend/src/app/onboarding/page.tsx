"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OnboardingIntroPage() {
  return (
    <AppShell className="flex items-center justify-center">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Bienvenido al onboarding</CardTitle>
          <CardDescription>Configura tu empresa para comenzar a operar en el WMS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            En tres pasos definiremos los datos principales de tu empresa, crearemos el usuario administrador y dejaremos listo el
            dashboard inicial.
          </p>
          <Button asChild>
            <Link href="/onboarding/company">Comenzar configuración</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
