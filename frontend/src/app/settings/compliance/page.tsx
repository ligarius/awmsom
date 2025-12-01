"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSection } from "@/components/FormSection";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { usePermissions } from "@/hooks/usePermissions";
import type { ComplianceSettings, PermissionReviewConfig } from "@/types/compliance";

export default function ComplianceSettingsPage() {
  const { get, patch } = useApi();
  const { canManageCompliance } = usePermissions();

  const [retentionDays, setRetentionDays] = useState("90");
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);

  const [reviewFrequency, setReviewFrequency] = useState("quarterly");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [notifyDays, setNotifyDays] = useState("7");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (!canManageCompliance) return;

    Promise.all([
      get<ComplianceSettings>("/compliance/settings"),
      get<PermissionReviewConfig>("/audit/reviews/settings")
    ])
      .then(([compliance, review]) => {
        if (compliance?.retentionDays) {
          setRetentionDays(String(compliance.retentionDays));
        }
        if (review) {
          setReviewFrequency(review.frequency);
          setNextReviewDate(review.nextReviewDate ?? "");
          if (typeof review.notifyDaysBefore === "number") {
            setNotifyDays(String(review.notifyDaysBefore));
          }
        }
      })
      .catch(() => {
        toast({ title: "No pudimos cargar las políticas", variant: "destructive" });
      });
  }, [canManageCompliance, get]);

  const handleRetentionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(retentionDays);

    if (!Number.isFinite(value) || value < 1) {
      setRetentionError("Define un número válido de días (mínimo 1)");
      return;
    }

    setRetentionError(null);
    setSavingRetention(true);

    try {
      await patch<ComplianceSettings>("/compliance/settings", { retentionDays: value });
      toast({
        title: "Retención actualizada",
        description: "Los registros históricos se ajustarán a la nueva política de retención."
      });
    } catch (error) {
      toast({ title: "No pudimos guardar la retención", variant: "destructive" });
    } finally {
      setSavingRetention(false);
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const notifyDaysNumber = Number(notifyDays);

    if (!nextReviewDate) {
      setReviewError("Define una fecha objetivo para la próxima revisión");
      return;
    }

    if (!Number.isFinite(notifyDaysNumber) || notifyDaysNumber < 0) {
      setReviewError("Define un número válido de días de anticipación");
      return;
    }

    setReviewError(null);
    setSavingReview(true);

    try {
      await patch<PermissionReviewConfig>("/audit/reviews/settings", {
        frequency: reviewFrequency,
        nextReviewDate,
        notifyDaysBefore: notifyDaysNumber
      });

      toast({
        title: "Revisión programada",
        description: "Notificaremos a los responsables antes de iniciar la revisión de permisos."
      });
    } catch (error) {
      toast({ title: "No pudimos programar la revisión", variant: "destructive" });
    } finally {
      setSavingReview(false);
    }
  };

  const nextReviewWarning = useMemo(() => {
    if (!nextReviewDate) return "";
    return `La revisión se ejecutará el ${new Date(nextReviewDate).toLocaleDateString()} (${reviewFrequency}).`;
  }, [nextReviewDate, reviewFrequency]);

  if (!canManageCompliance) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>Necesitas el scope compliance:manage para configurar estas políticas.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SettingsHeader
        title="Cumplimiento y retención"
        description="Define políticas de retención de datos y revisiones periódicas de permisos."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection
          title="Política de retención"
          description="Configura cuántos días se conservan los registros de auditoría y evidencia."
        >
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Reducir la retención eliminará logs históricos y evidencia de auditoría al siguiente ciclo de limpieza.
          </div>

          <form noValidate onSubmit={handleRetentionSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="retentionDays">Días de retención</Label>
              <Input
                id="retentionDays"
                type="number"
                min={1}
                value={retentionDays}
                onChange={(event) => setRetentionDays(event.target.value)}
                placeholder="90"
              />
              <p className="text-sm text-muted-foreground">Aplica a logs de auditoría y reportes exportados.</p>
              {retentionError ? <p className="text-sm text-destructive">{retentionError}</p> : null}
            </div>

            <Button type="submit" disabled={savingRetention}>
              {savingRetention ? "Guardando..." : "Guardar retención"}
            </Button>
          </form>
        </FormSection>

        <FormSection
          title="Revisiones de permisos"
          description="Programa recordatorios para revisar y auditar los accesos del tenant."
        >
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Las revisiones avisarán a los responsables y pueden bloquear aprobaciones si no se completan a tiempo.
          </div>

          <form noValidate onSubmit={handleReviewSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="frequency">Frecuencia</Label>
              <select
                id="frequency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={reviewFrequency}
                onChange={(event) => setReviewFrequency(event.target.value)}
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nextReview">Próxima revisión</Label>
              <Input
                id="nextReview"
                type="date"
                value={nextReviewDate}
                onChange={(event) => setNextReviewDate(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notifyDays">Avisar con (días)</Label>
              <Input
                id="notifyDays"
                type="number"
                min={0}
                value={notifyDays}
                onChange={(event) => setNotifyDays(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">Enviaremos recordatorios antes de la fecha programada.</p>
            </div>

            {reviewError ? <p className="text-sm text-destructive">{reviewError}</p> : null}
            {nextReviewWarning ? <p className="text-sm text-muted-foreground">{nextReviewWarning}</p> : null}

            <Button type="submit" disabled={savingReview}>
              {savingReview ? "Guardando..." : "Programar revisión"}
            </Button>
          </form>
        </FormSection>
      </div>
    </AppShell>
  );
}
