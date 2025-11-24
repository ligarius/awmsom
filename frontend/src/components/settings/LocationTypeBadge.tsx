interface LocationTypeBadgeProps {
  type: string;
}

const variants: Record<string, string> = {
  PALLET: "bg-blue-100 text-blue-700",
  PICKING: "bg-green-100 text-green-700",
  BULK: "bg-amber-100 text-amber-700",
};

export function LocationTypeBadge({ type }: LocationTypeBadgeProps) {
  const style = variants[type] ?? "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${style}`}>{type}</span>;
}
