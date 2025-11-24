"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AdjustmentForm } from "@/components/operations/AdjustmentForm";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdjustmentCreatePage() {
  const { canAdjustmentsWrite } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!canAdjustmentsWrite) router.replace("/forbidden");
  }, [canAdjustmentsWrite, router]);

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Registrar ajuste</h1>
        <p className="text-sm text-muted-foreground">Corrige inventario con trazabilidad</p>
      </div>
      <AdjustmentForm />
    </AppShell>
  );
}
