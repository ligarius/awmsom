"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import type { Warehouse } from "@/types/wms";

interface WarehouseSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  includeInactive?: boolean;
}

export function WarehouseSelect({ value, onChange, placeholder = "Selecciona bodega", includeInactive = false }: WarehouseSelectProps) {
  const { get } = useApi();
  const [options, setOptions] = useState<Warehouse[]>([]);

  useEffect(() => {
    get<Warehouse[]>("/warehouses")
      .then((items) => {
        setOptions(includeInactive ? items : items.filter((w) => w.isActive));
      })
      .catch(() => setOptions([]));
  }, [get, includeInactive]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name} ({option.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
