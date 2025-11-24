"use client";

interface StockHeatMapProps {
  title?: string;
  zones: { label: string; utilization: number }[];
  columns?: number;
}

function getColor(utilization: number) {
  const clamped = Math.max(0, Math.min(100, utilization));
  const hue = 120 - (clamped * 1.2);
  return `hsl(${hue}, 70%, 85%)`;
}

export function StockHeatMap({ title = "Mapa de inventario", zones, columns = 4 }: StockHeatMapProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">Ocupación por zona</div>
      </div>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {zones.map((zone) => (
          <div
            key={zone.label}
            className="flex h-20 flex-col items-center justify-center rounded border text-center"
            style={{ backgroundColor: getColor(zone.utilization) }}
          >
            <div className="text-xs font-semibold">{zone.label}</div>
            <div className="text-sm font-bold">{zone.utilization}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
