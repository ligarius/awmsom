import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Algo no salió bien",
  description = "Intenta de nuevo o contacta al equipo de soporte",
  retryLabel = "Reintentar",
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center", className)}>
      <div className="rounded-full bg-destructive/20 p-3">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-destructive">{title}</h3>
        <p className="text-sm text-destructive/80">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="destructive" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
