import type { ProductClass } from "@/types/wms";

export function ProductClassBadge({ productClass }: { productClass?: ProductClass }) {
  if (!productClass) return <span className="text-xs text-muted-foreground">Sin clase</span>;

  const tags = [
    productClass.isFragile ? "Frágil" : null,
    productClass.isHeavy ? "Pesado" : null,
    productClass.isCold ? "Refrigerado" : null,
    productClass.isHazmat ? "Peligroso" : null
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1 text-xs">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{productClass.code}</span>
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
          {tag}
        </span>
      ))}
    </div>
  );
}
