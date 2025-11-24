"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CompatibilityRule } from "@/types/operations";

interface Props {
  onSubmit: (rule: Omit<CompatibilityRule, "id">) => void;
  loading?: boolean;
}

export function CompatibilityRuleForm({ onSubmit, loading }: Props) {
  const [location, setLocation] = useState("");
  const [allowedClasses, setAllowedClasses] = useState("");
  const [blockedClasses, setBlockedClasses] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit({
      location,
      allowedClasses: allowedClasses.split(",").map((c) => c.trim()).filter(Boolean),
      blockedClasses: blockedClasses.split(",").map((c) => c.trim()).filter(Boolean),
      notes
    });
    setLocation("");
    setAllowedClasses("");
    setBlockedClasses("");
    setNotes("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva regla de compatibilidad</CardTitle>
        <CardDescription>Controla qué clases de producto pueden ubicarse juntas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Ubicación</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Z1-01-01" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Clases permitidas</Label>
            <Input
              value={allowedClasses}
              onChange={(e) => setAllowedClasses(e.target.value)}
              placeholder="A,B,C"
            />
          </div>
          <div className="space-y-2">
            <Label>Clases bloqueadas</Label>
            <Input
              value={blockedClasses}
              onChange={(e) => setBlockedClasses(e.target.value)}
              placeholder="FRAGIL,PELIGROSO"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Requiere rack reforzado" />
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Guardando..." : "Agregar regla"}
        </Button>
      </CardContent>
    </Card>
  );
}
