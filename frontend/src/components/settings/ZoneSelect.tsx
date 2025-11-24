"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import type { Zone } from "@/types/wms";

interface ZoneSelectProps {
  warehouseId?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function ZoneSelect({ warehouseId, value, onChange, placeholder = "Selecciona zona" }: ZoneSelectProps) {
  const { get } = useApi();
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    if (!warehouseId) return;
    get<Zone[]>("/zones", { warehouseId })
      .then((items) => setZones(items))
      .catch(() => setZones([]));
  }, [get, warehouseId]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {zones.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            {zone.name} ({zone.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
