"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";

export interface ProductOption {
  id: string;
  code: string;
  name: string;
  defaultUom: string;
  isActive: boolean;
}

interface ProductSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (product: ProductOption | null) => void;
  placeholder?: string;
  includeInactive?: boolean;
  valueMode?: "id" | "code";
}

export function ProductSelect({
  value,
  onChange,
  onSelect,
  placeholder = "Selecciona producto",
  includeInactive = false,
  valueMode = "id"
}: ProductSelectProps) {
  const { get } = useApi();
  const [options, setOptions] = useState<ProductOption[]>([]);

  useEffect(() => {
    get<ProductOption[]>("/products")
      .then((items) => {
        const filtered = includeInactive ? items : items.filter((product) => product.isActive);
        setOptions(filtered);
      })
      .catch(() => setOptions([]));
  }, [get, includeInactive]);

  const index = useMemo(() => {
    return new Map(options.map((option) => [valueMode === "id" ? option.id : option.code, option]));
  }, [options, valueMode]);

  const handleChange = (nextValue: string) => {
    onChange?.(nextValue);
    onSelect?.(index.get(nextValue) ?? null);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const optionValue = valueMode === "id" ? option.id : option.code;
          return (
            <SelectItem key={option.id} value={optionValue}>
              {option.code} · {option.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
