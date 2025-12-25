import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg border bg-card p-6", className)}>
      <LoadingSpinner message={message} />
    </div>
  );
}
