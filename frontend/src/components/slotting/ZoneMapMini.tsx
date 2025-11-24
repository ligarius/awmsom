"use client";

import { Card } from "@/components/ui/card";

interface ZoneMapMiniProps {
  title?: string;
  zones: { code: string; occupancy: number }[];
}

export function ZoneMapMini({ title = "Mapa de zona", zones }: ZoneMapMiniProps) {
  return (
    <Card className="space-y-2 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {zones.map((zone) => (
          <div
            key={zone.code}
            className="flex h-14 flex-col items-center justify-center rounded border"
            style={{ backgroundColor: `hsl(${120 - zone.occupancy}, 60%, 90%)` }}
          >
            <span className="font-semibold">{zone.code}</span>
            <span className="text-muted-foreground">{zone.occupancy}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
