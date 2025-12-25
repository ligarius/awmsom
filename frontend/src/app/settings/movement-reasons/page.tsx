"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { MovementReasonConfig } from "@/types/operations";

type FormState = {
  id?: string;
  code: string;
  label: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  label: "",
  description: ""
};

export default function MovementReasonsPage() {
  const router = useRouter();
  const { get, put } = useApi();
  const { canReadWmsConfig, canWriteWmsConfig } = usePermissions();
  const [reasons, setReasons] = useState<MovementReasonConfig[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const loadReasons = useCallback(() => {
    get<MovementReasonConfig[]>("/config/movement-reasons")
      .then((data) => setReasons(data))
      .catch(() => toast({ title: "No pudimos cargar los motivos", variant: "destructive" }));
  }, [get]);

  useEffect(() => {
    if (!canReadWmsConfig) {
      router.replace("/forbidden");
      return;
    }
    loadReasons();
  }, [canReadWmsConfig, loadReasons, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWriteWmsConfig) {
      toast({ title: "No tienes permisos para actualizar motivos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id: form.id,
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        description: form.description.trim() || undefined
      };
      await put("/config/movement-reasons", payload);
      toast({ title: form.id ? "Motivo actualizado" : "Motivo creado" });
      setForm(EMPTY_FORM);
      loadReasons();
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos guardar el motivo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reason: MovementReasonConfig) => {
    setForm({
      id: reason.id,
      code: reason.code,
      label: reason.label,
      description: reason.description ?? ""
    });
  };

  const updateReason = async (reason: MovementReasonConfig, patch: Partial<MovementReasonConfig>) => {
    if (!canWriteWmsConfig) {
      toast({ title: "No tienes permisos para actualizar motivos", variant: "destructive" });
      return;
    }
    try {
      await put("/config/movement-reasons", {
        id: reason.id,
        code: reason.code,
        label: reason.label,
        description: reason.description ?? undefined,
        isActive: patch.isActive ?? reason.isActive,
        isDefault: patch.isDefault ?? reason.isDefault
      });
      loadReasons();
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos actualizar el motivo", variant: "destructive" });
    }
  };

  const sortedReasons = useMemo(
    () =>
      [...reasons].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.label.localeCompare(b.label);
      }),
    [reasons]
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <SettingsHeader
          title="Motivos de movimiento"
          description="Lista controlada para registrar movimientos internos."
          backTo="/settings"
        />

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar motivo" : "Nuevo motivo"}</CardTitle>
          <CardDescription>Define el codigo y la etiqueta que veran los operadores.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Codigo</Label>
              <Input
                id="code"
                required
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="RELOCATE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Etiqueta</Label>
              <Input
                id="label"
                required
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Reubicacion interna"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Contexto o uso sugerido"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : form.id ? "Actualizar motivo" : "Crear motivo"}
              </Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={() => setForm(EMPTY_FORM)}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Motivos disponibles</CardTitle>
          <CardDescription>Activa, desactiva o define el motivo predeterminado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Predeterminado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReasons.map((reason) => (
                <TableRow key={reason.id}>
                  <TableCell className="font-semibold">{reason.code}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{reason.label}</div>
                    {reason.description && <div className="text-xs text-muted-foreground">{reason.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reason.isActive ? "secondary" : "outline"}>
                      {reason.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reason.isDefault ? <Badge>Default</Badge> : <Badge variant="outline">-</Badge>}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(reason)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateReason(reason, { isActive: !reason.isActive })}
                    >
                      {reason.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    {!reason.isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateReason(reason, { isDefault: true, isActive: true })}
                      >
                        Hacer default
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!sortedReasons.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No hay motivos configurados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </AppShell>
  );
}
