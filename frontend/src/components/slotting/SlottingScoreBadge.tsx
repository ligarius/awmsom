"use client";

import { Badge } from "@/components/ui/badge";

interface SlottingScoreBadgeProps {
  score: number;
}

export function SlottingScoreBadge({ score }: SlottingScoreBadgeProps) {
  const variant = score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive";
  const label = score >= 80 ? "Óptimo" : score >= 50 ? "Mejorable" : "Crítico";

  return (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      <span>{label}</span>
      <span className="font-semibold">{score}</span>
    </Badge>
  );
}
