import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { useApi } from "@/hooks/useApi";
import type { InboundDocument, InboundLine } from "@/types/operations";
import { BatchInput } from "@/components/operations/BatchInput";
import { LocationSuggestionCard } from "@/components/operations/LocationSuggestionCard";

interface InboundReceiveStepProps {
  inbound: InboundDocument;
  onCompleted?: () => void;
}

interface LocationSuggestion {
  code: string;
  distance?: string;
  reason?: string;
}

export function InboundReceiveStep({ inbound, onCompleted }: InboundReceiveStepProps) {
  const { post, get, patch } = useApi();
  const [selectedLine, setSelectedLine] = useState<InboundLine | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [batch, setBatch] = useState("");
  const [location, setLocation] = useState("");
  const [suggestion, setSuggestion] = useState<LocationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<InboundLine[]>(inbound.lines);

  useEffect(() => {
    if (!selectedLine) return;
    get<LocationSuggestion>(`/locations/suggestions`, { productId: selectedLine.productId, warehouseId: inbound.warehouseId })
      .then((data) => setSuggestion(data))
      .catch(() => setSuggestion(null));
  }, [get, inbound.warehouseId, selectedLine]);

  const remaining = useMemo(() => lines.filter((line) => (line.receivedQty ?? 0) < line.expectedQty), [lines]);
  const progress = useMemo(() => Math.round(((lines.length - remaining.length) / lines.length) * 100), [lines.length, remaining.length]);

  const handleSelectLine = (line: InboundLine) => {
    setSelectedLine(line);
    setQuantity(Math.max(0, line.expectedQty - (line.receivedQty ?? 0)));
    setBatch(line.batchNumber ?? "");
    setLocation(suggestion?.code ?? "");
  };

  const handleReceive = async () => {
    if (!selectedLine) return;
    if (selectedLine.isBatchManaged && !batch) {
      toast({ title: "Falta lote", description: "Este SKU requiere capturar lote", variant: "destructive" });
      return;
    }
    if (!location.trim()) {
      toast({ title: "Falta ubicación", description: "Selecciona una ubicación válida", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await post(`/inbound/${inbound.id}/receive-line`, {
        lineId: selectedLine.id,
        quantity,
        batch: batch || undefined,
        location
      });
      toast({ title: "Línea recibida", description: `${quantity} unidades confirmadas` });
      setLines((prev) =>
        prev.map((l) => (l.id === selectedLine.id ? { ...l, receivedQty: (l.receivedQty ?? 0) + quantity, batchNumber: batch } : l))
      );
      setSelectedLine(null);
      setQuantity(0);
      setBatch("");
      setLocation("");
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos registrar la recepción", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await patch(`/inbound/${inbound.id}/complete`);
      toast({ title: "Recepción finalizada" });
      onCompleted?.();
    } catch (error) {
      console.error(error);
      toast({ title: "No pudimos cerrar la recepción", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Progreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{lines.length - remaining.length} de {lines.length} líneas recibidas</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 space-y-2">
          <p className="text-sm font-medium">Líneas pendientes</p>
          {remaining.length === 0 && <p className="text-sm text-muted-foreground">Todo recibido</p>}
          <div className="space-y-2">
            {remaining.map((line) => (
              <Card
                key={line.id}
                className={`cursor-pointer ${selectedLine?.id === line.id ? "border-primary" : ""}`}
                onClick={() => handleSelectLine(line)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{line.productSku}</CardTitle>
                  <p className="text-sm text-muted-foreground">{line.productName}</p>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span>Esperado: {line.expectedQty}</span>
                  <Badge variant="outline">Recibido: {line.receivedQty ?? 0}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          <p className="text-sm font-medium">Captura</p>
          {!selectedLine && <p className="text-sm text-muted-foreground">Selecciona una línea para comenzar.</p>}
          {selectedLine && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedLine.productSku}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedLine.productName}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Cantidad esperada</p>
                    <p className="text-xl font-semibold">{selectedLine.expectedQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recibido</p>
                    <p className="text-xl font-semibold">{selectedLine.receivedQty ?? 0}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="quantity">
                    Cantidad a recibir
                  </label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <BatchInput
                  value={batch}
                  onChange={setBatch}
                  required={selectedLine.isBatchManaged}
                  error={selectedLine.isBatchManaged && !batch ? "Obligatorio" : undefined}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="location">
                    Ubicación final
                  </label>
                  <Input
                    id="location"
                    value={location}
                    placeholder="Ej: REC-01-01"
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  {suggestion && (
                    <LocationSuggestionCard
                      locationCode={suggestion.code}
                      distance={suggestion.distance}
                      reason={suggestion.reason}
                      onSelect={() => setLocation(suggestion.code)}
                    />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedLine(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleReceive} disabled={loading}>
                    {loading ? "Guardando..." : "Confirmar recepción"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {remaining.length === 0 && (
            <Button className="w-full" onClick={handleComplete} disabled={loading}>
              Finalizar recepción
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
