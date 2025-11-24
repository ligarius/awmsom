import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message = "Cargando...", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground", className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
