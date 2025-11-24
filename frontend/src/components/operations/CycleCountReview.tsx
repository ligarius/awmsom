import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CycleCountTaskLine } from "@/types/operations";

interface CycleCountReviewProps {
  lines: CycleCountTaskLine[];
  onApprove: () => void;
  onReject: () => void;
}

export function CycleCountReview({ lines, onApprove, onReject }: CycleCountReviewProps) {
  const differences = lines.filter((line) => line.counted !== undefined && line.counted !== line.theoretical);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisión de diferencias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lines.map((line) => {
          const delta = (line.counted ?? line.theoretical) - line.theoretical;
          const isDifferent = delta !== 0;
          return (
            <div key={`${line.location}-${line.sku}`} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{line.location}</p>
                  <p className="text-sm text-muted-foreground">{line.productName ?? line.sku}</p>
                </div>
                <Badge variant={isDifferent ? "secondary" : "outline"}>{isDifferent ? "Diferencia" : "Ok"}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Teórico</p>
                  <p className="font-semibold">{line.theoretical}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contado</p>
                  <p className="font-semibold">{line.counted ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Diferencia</p>
                  <p className={delta === 0 ? "text-green-700" : "text-destructive"}>{delta}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between rounded-md bg-muted/40 p-3 text-sm">
          <div>
            <p className="font-medium">Resumen</p>
            <p className="text-muted-foreground">{differences.length} líneas con diferencias</p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={onReject}>
              Rechazar
            </Button>
            <Button onClick={onApprove}>Aprobar ajustes</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
