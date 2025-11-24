"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function OnboardingFinishPage() {
  return (
    <AppShell className="flex items-center justify-center">
      <Card className="max-w-xl text-center">
        <CardHeader>
          <div className="flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <CardTitle>Setup inicial completado</CardTitle>
          <CardDescription>Tu tenant está listo para operar.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los datos fueron guardados y se generó el usuario administrador. Puedes continuar al dashboard para revisar los módulos
            disponibles.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
