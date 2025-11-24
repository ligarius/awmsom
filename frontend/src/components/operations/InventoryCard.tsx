import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { InventorySummary } from "@/types/operations";

interface InventoryCardProps {
  summary: InventorySummary;
}

export function InventoryCard({ summary }: InventoryCardProps) {
  const distribution = Math.min(100, (summary.locationCount ?? 0) * 10 + (summary.batchCount ?? 0) * 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{summary.sku}</CardTitle>
        <CardDescription>{summary.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Unidades</span>
          <span className="font-semibold">{summary.totalUnits.toLocaleString()} {summary.totalUom ?? "u"}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Lotes</span>
          <span>{summary.batchCount ?? 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Ubicaciones</span>
          <span>{summary.locationCount ?? 0}</span>
        </div>
        <Progress value={distribution} />
        <p className="text-xs text-muted-foreground">Distribución en layout: {distribution}% optimizada</p>
      </CardContent>
    </Card>
  );
}
