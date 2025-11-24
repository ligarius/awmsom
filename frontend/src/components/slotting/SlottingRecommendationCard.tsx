"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlottingScoreBadge } from "@/components/slotting/SlottingScoreBadge";
import type { SlottingRecommendation } from "@/types/operations";
import { ArrowUpRight, CheckCircle2, Play } from "lucide-react";

interface Props {
  recommendation: SlottingRecommendation;
  onApprove?: (id: string) => void;
  onExecute?: (id: string) => void;
  disabled?: boolean;
}

export function SlottingRecommendationCard({ recommendation, onApprove, onExecute, disabled }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-start justify-between space-y-0">
        <div>
          <CardTitle>{recommendation.sku}</CardTitle>
          <CardDescription>{recommendation.productName ?? "SKU"}</CardDescription>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Actual: {recommendation.currentLocation}</span>
            <ArrowUpRight className="h-3 w-3" />
            <span>Recomendada: {recommendation.recommendedLocation}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SlottingScoreBadge score={recommendation.score} />
          <Badge variant="secondary">{recommendation.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded border p-2">
          <div className="text-xs text-muted-foreground">Clasificación</div>
          <div className="font-semibold">
            ABC: {recommendation.abcClass ?? "-"} | XYZ: {recommendation.xyzClass ?? "-"}
          </div>
        </div>
        <div className="text-muted-foreground">Razón: {recommendation.reason}</div>
        {recommendation.impact && <div className="text-xs text-muted-foreground">Impacto: {recommendation.impact}</div>}
        <div className="flex flex-wrap gap-2">
          {onApprove && recommendation.status === "PENDING" && (
            <Button size="sm" onClick={() => onApprove(recommendation.id)} disabled={disabled}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar
            </Button>
          )}
          {onExecute && (recommendation.status === "APPROVED" || recommendation.status === "PENDING") && (
            <Button size="sm" variant="outline" onClick={() => onExecute(recommendation.id)} disabled={disabled}>
              <Play className="mr-2 h-4 w-4" /> Ejecutar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
