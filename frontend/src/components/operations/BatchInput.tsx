import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BatchInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

export function BatchInput({ value, onChange, required, error }: BatchInputProps) {
  const helper = useMemo(() => {
    if (required) return "Requerido para productos con gestión de lote";
    return "Opcional. Usa un número de lote legible para el operario.";
  }, [required]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor="batch">Lote</Label>
        {required && <span className="text-xs text-destructive">Obligatorio</span>}
      </div>
      <Input
        id="batch"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="Ej: LOTE-2024-09"
        className={cn(error && "border-destructive")}
      />
      <p className={cn("text-xs text-muted-foreground", error && "text-destructive")}>{error ?? helper}</p>
    </div>
  );
}
