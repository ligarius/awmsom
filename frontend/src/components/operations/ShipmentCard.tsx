import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shipment } from "@/types/operations";
import { Truck } from "lucide-react";

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Shipment</p>
            <CardTitle>{shipment.id}</CardTitle>
          </div>
        </div>
        <Badge>{shipment.status}</Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Carrier</p>
          <p className="font-semibold">{shipment.carrierRef ?? "Pendiente"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ruta</p>
          <p className="font-semibold">{shipment.routeRef ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vehículo</p>
          <p className="font-semibold">{shipment.vehicleRef ?? "Pendiente"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Salida programada</p>
          <p className="font-semibold">{shipment.scheduledDeparture ?? "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
