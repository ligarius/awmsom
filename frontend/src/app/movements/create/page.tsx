"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MovementForm } from "@/components/operations/MovementForm";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MovementCreatePage() {
  const { canMovementsWrite } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!canMovementsWrite) router.replace("/forbidden");
  }, [canMovementsWrite, router]);

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Crear movimiento</h1>
        <p className="text-sm text-muted-foreground">Mueve inventario entre ubicaciones</p>
      </div>
      <MovementForm />
    </AppShell>
  );
}
