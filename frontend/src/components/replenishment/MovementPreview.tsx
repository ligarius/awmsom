"use client";

import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface MovementPreviewProps {
  source: string;
  destination: string;
  quantity: number;
  safetyStock?: number;
  min?: number;
  max?: number;
}

export function MovementPreview({ source, destination, quantity, safetyStock, min, max }: MovementPreviewProps) {
  const maxValue = max ?? Math.max(quantity, safetyStock ?? 0, min ?? 0);
  const pct = Math.min(100, Math.round(((quantity ?? 0) / (maxValue || 1)) * 100));

  return (
    <div className="rounded-lg border bg-muted/50 p-3 text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Movimiento interno</span>
        <span>
          {source} → {destination}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground">{quantity} u</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {min !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Min {min}
              </TooltipTrigger>
              <TooltipContent>Umbral mínimo configurado para la ubicación de picking.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {safetyStock !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Safety {safetyStock}
              </TooltipTrigger>
              <TooltipContent>Stock de seguridad considerado por la política.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {max !== undefined && <span>Max {max}</span>}
      </div>
    </div>
  );
}
