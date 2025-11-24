"use client";

import { ArrowRightLeft, Box, User } from "lucide-react";

export interface MovementTraceItem {
  id: string;
  from: string;
  to: string;
  user: string;
  sku: string;
  batch?: string;
  quantity: number;
  timestamp: string;
  impact: string;
}

export function MovementTraceList({ items }: { items: MovementTraceItem[] }) {
  if (!items.length) {
    return <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">Sin movimientos registrados.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(item.timestamp).toLocaleString()}</span>
            <span>{item.impact}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium">
            <ArrowRightLeft className="h-4 w-4 text-primary" /> {item.from} → {item.to}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.batch ?? "Sin lote"}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Box className="h-4 w-4" /> {item.sku}
            </span>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">{item.quantity} uds</span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" /> {item.user}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
