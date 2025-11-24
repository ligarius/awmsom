"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { ReplenishmentPolicyConfig } from "@/types/operations";

interface Props {
  defaultValues?: ReplenishmentPolicyConfig;
  onSubmit: (values: ReplenishmentPolicyConfig) => void;
  loading?: boolean;
}

export function ReplenishmentPolicyForm({ defaultValues, onSubmit, loading }: Props) {
  const [values, setValues] = useState<ReplenishmentPolicyConfig>(
    defaultValues ?? {
      min: 0,
      max: 0,
      safetyStock: 0,
      pickingStrategy: "FIFO",
      pickingZones: [],
      pickingUom: "UN",
      notes: ""
    }
  );

  const handleChange = (key: keyof ReplenishmentPolicyConfig, value: string | number | string[]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar políticas</CardTitle>
        <CardDescription>Define los umbrales y reglas de reposición.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Min</Label>
            <Input
              type="number"
              value={values.min}
              onChange={(e) => handleChange("min", Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>Max</Label>
            <Input
              type="number"
              value={values.max}
              onChange={(e) => handleChange("max", Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>Safety stock</Label>
            <Input
              type="number"
              value={values.safetyStock}
              onChange={(e) => handleChange("safetyStock", Number(e.target.value))}
              min={0}
            />
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Estrategia de picking</Label>
            <Input
              value={values.pickingStrategy}
              onChange={(e) => handleChange("pickingStrategy", e.target.value as ReplenishmentPolicyConfig["pickingStrategy"])}
              placeholder="FIFO o FEFO"
            />
          </div>
          <div className="space-y-2">
            <Label>UoM de picking</Label>
            <Input value={values.pickingUom} onChange={(e) => handleChange("pickingUom", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Zonas de picking (separadas por coma)</Label>
          <Input
            value={values.pickingZones.join(",")}
            onChange={(e) => handleChange("pickingZones", e.target.value.split(",").map((z) => z.trim()).filter(Boolean))}
            placeholder="A1,A2,B1"
          />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea
            value={values.notes ?? ""}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Consideraciones adicionales"
          />
        </div>
        <Button onClick={() => onSubmit(values)} disabled={loading}>
          {loading ? "Guardando..." : "Guardar políticas"}
        </Button>
      </CardContent>
    </Card>
  );
}
