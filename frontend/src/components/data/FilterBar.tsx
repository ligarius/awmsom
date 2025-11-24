"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface FilterBarProps {
  placeholder?: string;
  onSearch?: (term: string) => void;
}

export function FilterBar({ placeholder = "Buscar", onSearch }: FilterBarProps) {
  const [term, setTerm] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <div className="text-sm text-muted-foreground">Filtra tus resultados rápidamente</div>
      </div>
      <div className="flex w-full gap-2 sm:w-1/2">
        <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={placeholder} />
        <Button onClick={() => onSearch?.(term)} variant="default">
          Buscar
        </Button>
      </div>
    </div>
  );
}
