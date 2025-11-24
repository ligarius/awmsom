import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PickingPathPlan } from "@/types/operations";

export function WavePlanRouteTable({ plan }: { plan: PickingPathPlan }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Aisle</TableHead>
            <TableHead>Rack</TableHead>
            <TableHead>Nivel</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Cantidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.stops.map((stop) => (
            <TableRow key={`${stop.sequence}-${stop.locationCode}`}>
              <TableCell className="font-semibold">{stop.sequence}</TableCell>
              <TableCell>{stop.locationCode}</TableCell>
              <TableCell>{stop.aisle ?? "-"}</TableCell>
              <TableCell>{stop.rack ?? "-"}</TableCell>
              <TableCell>{stop.level ?? "-"}</TableCell>
              <TableCell>
                <div className="font-semibold">{stop.productSku}</div>
                <div className="text-xs text-muted-foreground">{stop.productName}</div>
              </TableCell>
              <TableCell>{stop.quantity}</TableCell>
            </TableRow>
          ))}
          {!plan.stops.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No hay ubicaciones planificadas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
