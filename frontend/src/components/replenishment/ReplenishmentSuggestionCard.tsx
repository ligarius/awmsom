"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MovementPreview } from "@/components/replenishment/MovementPreview";
import type { ReplenishmentSuggestion } from "@/types/operations";
import { ArrowRightLeft, CheckCircle, Play } from "lucide-react";

interface Props {
  suggestion: ReplenishmentSuggestion;
  onApprove?: (id: string) => void;
  onExecute?: (id: string) => void;
  disabled?: boolean;
}

export function ReplenishmentSuggestionCard({ suggestion, onApprove, onExecute, disabled }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{suggestion.sku}</CardTitle>
          <CardDescription>{suggestion.productName ?? "SKU sin descripción"}</CardDescription>
        </div>
        <Badge variant={suggestion.status === "EXECUTED" ? "default" : "secondary"}>{suggestion.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" />
          <span>
            {suggestion.sourceLocation} → {suggestion.destinationLocation}
          </span>
        </div>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded border p-2">
            <div className="text-xs text-muted-foreground">Cantidad sugerida</div>
            <div className="text-lg font-semibold">
              {suggestion.suggestedQty} {suggestion.uom ?? "u"}
            </div>
            <div className="text-xs text-muted-foreground">Motivo: {suggestion.reason}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-xs text-muted-foreground">Score / Política</div>
            <div className="text-lg font-semibold">{suggestion.score ?? "-"}</div>
            <div className="text-xs text-muted-foreground">{suggestion.policyApplied ?? "Min/Max"}</div>
          </div>
        </div>
        <MovementPreview
          source={suggestion.sourceLocation}
          destination={suggestion.destinationLocation}
          quantity={suggestion.suggestedQty}
          safetyStock={suggestion.safetyStock}
          min={suggestion.min}
          max={suggestion.max}
        />
        <div className="flex flex-wrap gap-2">
          {onApprove && suggestion.status === "PENDING" && (
            <Button size="sm" onClick={() => onApprove(suggestion.id)} disabled={disabled}>
              <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
            </Button>
          )}
          {onExecute && (suggestion.status === "APPROVED" || suggestion.status === "PENDING") && (
            <Button size="sm" variant="outline" onClick={() => onExecute(suggestion.id)} disabled={disabled}>
              <Play className="mr-2 h-4 w-4" /> Ejecutar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
