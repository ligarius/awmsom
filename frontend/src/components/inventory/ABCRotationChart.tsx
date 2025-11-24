"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ABCRotationItem } from "@/types/operations";

interface Props {
  items: ABCRotationItem[];
}

export function ABCRotationChart({ items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rotación ABC</CardTitle>
        <CardDescription>Clasificación calculada por consumo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          {items.map((item) => (
            <div key={item.sku} className="flex items-center gap-3 rounded border p-2">
              <div className="w-24 font-semibold">{item.sku}</div>
              <div className="flex-1">
                <div className="h-2 rounded bg-muted">
                  <div
                    className={`h-2 rounded ${item.category === "A" ? "bg-green-500" : item.category === "B" ? "bg-amber-400" : "bg-slate-400"}`}
                    style={{ width: `${Math.min(100, item.consumption)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">{item.productName}</div>
              </div>
              <div className="w-16 text-center text-sm font-semibold">{item.category}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
