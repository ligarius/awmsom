import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CycleCountTaskLine } from "@/types/operations";

interface CycleCountTaskListProps {
  lines: CycleCountTaskLine[];
  onUpdate: (lines: CycleCountTaskLine[]) => void;
}

export function CycleCountTaskList({ lines, onUpdate }: CycleCountTaskListProps) {
  const handleChange = (index: number, value: number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], counted: value };
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => (
        <Card key={`${line.location}-${line.sku}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">{line.location}</CardTitle>
              <p className="text-sm text-muted-foreground">{line.productName ?? line.sku}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">Teórico: {line.theoretical}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                value={line.counted ?? ""}
                placeholder="Conteo físico"
                onChange={(e) => handleChange(idx, Number(e.target.value))}
              />
              <div className="text-xs text-muted-foreground">Informa cantidades exactas observadas en piso.</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
