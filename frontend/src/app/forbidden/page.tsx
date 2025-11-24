import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <AppShell className="flex items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader className="flex flex-row items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          <div>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>No cuentas con permisos suficientes para esta sección.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Verifica que tu rol incluya los permisos necesarios o contacta a un administrador del tenant para habilitar el acceso.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard">Volver al dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Cambiar de usuario</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
