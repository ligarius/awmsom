"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterState {
  search?: string;
  sku?: string;
  customer?: string;
  from?: string;
  to?: string;
}

interface FilterBarAdvancedProps {
  storageKey: string;
  onChange: (filters: FilterState) => void;
}

export function FilterBarAdvanced({ storageKey, onChange }: FilterBarAdvancedProps) {
  const initial = useMemo<FilterState>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as FilterState) : {};
  }, [storageKey]);

  const [filters, setFilters] = useState<FilterState>(initial);

  useEffect(() => {
    onChange(filters);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(filters));
    }
  }, [filters, onChange, storageKey]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1">
        <label className="text-xs text-muted-foreground">Búsqueda global</label>
        <Input
          placeholder="SKU, orden, cliente"
          value={filters.search ?? ""}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">SKU</label>
        <Input value={filters.sku ?? ""} onChange={(event) => setFilters((prev) => ({ ...prev, sku: event.target.value }))} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Cliente</label>
        <Input
          value={filters.customer ?? ""}
          onChange={(event) => setFilters((prev) => ({ ...prev, customer: event.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Desde</label>
        <Input
          type="date"
          value={filters.from ?? ""}
          onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value || undefined }))}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Hasta</label>
        <Input
          type="date"
          value={filters.to ?? ""}
          onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value || undefined }))}
        />
      </div>
      <Button variant="outline" onClick={() => setFilters({})}>
        Limpiar filtros
      </Button>
    </div>
  );
}
