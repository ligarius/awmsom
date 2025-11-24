"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SlottingConfig } from "@/types/operations";

interface Props {
  defaultValues?: SlottingConfig;
  onSubmit: (values: SlottingConfig) => void;
  loading?: boolean;
}

export function SlottingConfigForm({ defaultValues, onSubmit, loading }: Props) {
  const [values, setValues] = useState<SlottingConfig>(
    defaultValues ?? {
      abcPeriodDays: 30,
      xyzPeriodDays: 30,
      goldenZoneLocations: [],
      specialZones: [],
      autoSlottingEnabled: false
    }
  );

  const handleChange = (key: keyof SlottingConfig, value: string | number | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parámetros de slotting</CardTitle>
        <CardDescription>Define horizontes ABC/XYZ y zonas prioritarias.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Periodo ABC (días)</Label>
            <Input
              type="number"
              value={values.abcPeriodDays}
              onChange={(e) => handleChange("abcPeriodDays", Number(e.target.value))}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Periodo XYZ (días)</Label>
            <Input
              type="number"
              value={values.xyzPeriodDays}
              onChange={(e) => handleChange("xyzPeriodDays", Number(e.target.value))}
              min={1}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Golden zone (códigos de ubicación)</Label>
          <Input
            value={values.goldenZoneLocations.join(",")}
            onChange={(e) => handleChange("goldenZoneLocations", e.target.value.split(",").map((z) => z.trim()).filter(Boolean))}
            placeholder="Z1-01,Z1-02"
          />
        </div>
        <div className="space-y-2">
          <Label>Zonas especiales (nombre:loc1|loc2)</Label>
          <Input
            value={(values.specialZones ?? []).map((z) => `${z.name}:${z.locations.join("|")}`).join(",")}
            onChange={(e) =>
              handleChange(
                "specialZones",
                e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .map((entry) => {
                    const [name, locs] = entry.split(":");
                    return { name: name ?? "", locations: (locs ?? "").split("|").filter(Boolean) };
                  })
              )
            }
            placeholder="Pesado:Z3-01|Z3-02"
          />
        </div>
        <div className="flex items-center justify-between rounded border p-3">
          <div>
            <div className="font-medium">Slotting automático</div>
            <p className="text-sm text-muted-foreground">Permite que el backend emita re-slotting sin aprobación previa.</p>
          </div>
          <Switch
            checked={values.autoSlottingEnabled}
            onCheckedChange={(checked) => handleChange("autoSlottingEnabled", checked)}
          />
        </div>
        <Button onClick={() => onSubmit(values)} disabled={loading}>
          {loading ? "Guardando..." : "Guardar configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}
