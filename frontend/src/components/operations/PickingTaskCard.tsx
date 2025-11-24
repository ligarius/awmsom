import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PickingTask } from "@/types/operations";
import { MapPin, Package } from "lucide-react";

interface PickingTaskCardProps {
  task: PickingTask;
  actionSlot?: React.ReactNode;
}

export function PickingTaskCard({ task, actionSlot }: PickingTaskCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <p className="text-xs text-muted-foreground">Tarea</p>
          <CardTitle>{task.code}</CardTitle>
        </div>
        <Badge variant={task.status === "DONE" ? "secondary" : task.status === "IN_PROGRESS" ? "default" : "outline"}>
          {task.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-semibold">{task.productSku}</p>
            <p className="text-muted-foreground">{task.productName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Cantidad</p>
            <p className="font-semibold">{task.quantity} {task.uom ?? "uds"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wave</p>
            <p className="font-semibold">{task.waveId ?? "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Ubicación origen</p>
            <p className="font-semibold">{task.locationCode ?? "Sin ubicación"}</p>
          </div>
        </div>
      </CardContent>
      {actionSlot && <CardFooter className="justify-end">{actionSlot}</CardFooter>}
    </Card>
  );
}
