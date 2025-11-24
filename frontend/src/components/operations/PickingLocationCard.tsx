import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Route } from "lucide-react";

interface PickingLocationCardProps {
  code?: string;
  aisle?: string;
  rack?: string;
  level?: string;
  hint?: string;
}

export function PickingLocationCard({ code, aisle, rack, level, hint }: PickingLocationCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Ubicación asignada
        </div>
        {code && <Badge variant="outline">{code}</Badge>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" />
          <div className="grid grid-cols-3 gap-2 text-xs uppercase text-muted-foreground">
            <div>
              <p className="text-[10px]">Pasillo</p>
              <p className="font-semibold text-foreground">{aisle ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px]">Rack</p>
              <p className="font-semibold text-foreground">{rack ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px]">Nivel</p>
              <p className="font-semibold text-foreground">{level ?? "-"}</p>
            </div>
          </div>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
