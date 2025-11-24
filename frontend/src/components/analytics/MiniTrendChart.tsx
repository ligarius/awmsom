"use client";

interface MiniTrendChartProps {
  data: number[];
  color?: string;
  height?: number;
  showArea?: boolean;
}

export function MiniTrendChart({ data, color = "#2563eb", height = 56, showArea = true }: MiniTrendChartProps) {
  if (!data.length) return <div className="text-xs text-muted-foreground">Sin datos</div>;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const normalize = (value: number) => {
    if (max === min) return height / 2;
    return ((value - min) / (max - min)) * (height - 12) + 6;
  };

  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = height - normalize(value);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} 100,${height}`;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="h-14 w-full">
      {showArea ? <polyline points={areaPoints} fill={`${color}20`} stroke="none" /> : null}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
