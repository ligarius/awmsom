"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LowStockAlert } from "@/types/operations";
import { AlertTriangle } from "lucide-react";

interface Props {
  alert: LowStockAlert;
  onGenerate?: (sku: string) => void;
  disabled?: boolean;
}

export function LowStockAlertRow({ alert, onGenerate, disabled }: Props) {
  return (
    <div className="flex items-center justify-between rounded border p-3 text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <div>
          <div className="font-semibold">{alert.sku}</div>
          <div className="text-xs text-muted-foreground">{alert.productName ?? "SKU"}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">Disp {alert.available}</Badge>
        <Badge variant="destructive">Min {alert.min}</Badge>
        <Badge>{alert.priority}</Badge>
        {onGenerate && (
          <Button size="sm" variant="outline" onClick={() => onGenerate(alert.sku)} disabled={disabled}>
            Generar sugerencia
          </Button>
        )}
      </div>
    </div>
  );
}
