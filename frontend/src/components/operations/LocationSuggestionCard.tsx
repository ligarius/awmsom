import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, MoveRight } from "lucide-react";

interface LocationSuggestionCardProps {
  locationCode: string;
  distance?: string;
  reason?: string;
  onSelect?: () => void;
}

export function LocationSuggestionCard({ locationCode, distance, reason, onSelect }: LocationSuggestionCardProps) {
  return (
    <Card className="border-primary/30 bg-primary/5" onClick={onSelect} role={onSelect ? "button" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Ubicación sugerida</CardTitle>
        <Badge variant="outline" className="text-xs">
          <MapPin className="mr-1 h-3 w-3" />
          {distance ?? "Cercana"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <MoveRight className="h-4 w-4 text-primary" />
          {locationCode}
        </div>
        <CardDescription>{reason ?? "Optimizada por proximidad y capacidad disponible"}</CardDescription>
      </CardContent>
    </Card>
  );
}
