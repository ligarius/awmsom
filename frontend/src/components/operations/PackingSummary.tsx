import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PackingShipmentLine } from "@/types/operations";

export function PackingSummary({ lines }: { lines: PackingShipmentLine[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos pickeados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.map((line) => (
          <div key={line.productSku} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{line.productSku}</p>
                <p className="text-sm text-muted-foreground">{line.productName}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Cantidad</p>
                <p className="font-semibold">
                  {line.packedQuantity ?? line.quantity} {line.uom ?? "uds"}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!lines.length && <p className="text-sm text-muted-foreground">No hay productos para empaquetar.</p>}
      </CardContent>
    </Card>
  );
}
