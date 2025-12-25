"use client";

import { useState } from "react";
import { FilterBar as BaseFilterBar } from "@/components/layout/FilterBar";

interface FilterBarProps {
  placeholder?: string;
  onSearch?: (term: string) => void;
}

export function FilterBar({ placeholder = "Buscar", onSearch }: FilterBarProps) {
  const [term, setTerm] = useState("");

  return (
    <BaseFilterBar
      hint="Filtra tus resultados rapidamente"
      search={{
        value: term,
        onChange: setTerm,
        placeholder,
        onSubmit: onSearch ? () => onSearch(term) : undefined
      }}
    />
  );
}
