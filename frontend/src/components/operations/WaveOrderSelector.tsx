import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OutboundOrder } from "@/types/operations";
import { OutboundStatusBadge } from "./OutboundStatusBadge";

interface WaveOrderSelectorProps {
  orders: OutboundOrder[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function WaveOrderSelector({ orders, selectedIds, onChange }: WaveOrderSelectorProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <ScrollArea className="h-64 rounded-md border p-2">
      <div className="space-y-2">
        {orders.map((order) => (
          <label
            key={order.id}
            className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedIds.includes(order.id)} onCheckedChange={() => toggle(order.id)} />
              <div>
                <p className="font-semibold leading-tight">{order.externalRef ?? order.customerRef ?? order.id}</p>
                <p className="text-xs text-muted-foreground">Cliente {order.customerRef ?? "-"} • {order.lines.length} líneas</p>
              </div>
            </div>
            <OutboundStatusBadge status={order.status} />
          </label>
        ))}
        {!orders.length && <p className="text-sm text-muted-foreground">No hay órdenes disponibles para wave.</p>}
      </div>
    </ScrollArea>
  );
}
