"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterBarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

interface FilterBarProps {
  search?: FilterBarSearch;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onMoreFilters?: () => void;
  moreFiltersLabel?: string;
  className?: string;
  hint?: string;
}

export function FilterBar({
  search,
  filters,
  actions,
  onMoreFilters,
  moreFiltersLabel = "Mas filtros",
  className,
  hint
}: FilterBarProps) {
  return (
    <div className={cn("rounded-lg border bg-card shadow-panel", className)}>
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {search ? (
            <div className="relative flex w-full items-center sm:max-w-sm">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    search.onSubmit?.();
                  }
                }}
                placeholder={search.placeholder ?? "Buscar"}
                className="pl-8"
              />
            </div>
          ) : null}
          {filters ? <div className="flex flex-1 flex-wrap items-center gap-3">{filters}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          {onMoreFilters ? (
            <Button variant="outline" size="sm" onClick={onMoreFilters}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {moreFiltersLabel}
            </Button>
          ) : null}
          {search?.onSubmit ? (
            <Button variant="default" size="sm" onClick={search.onSubmit}>
              Buscar
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
      {hint ? <div className="border-t px-4 py-2 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
