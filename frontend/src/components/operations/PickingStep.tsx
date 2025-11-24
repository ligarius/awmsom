import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

interface PickingStepProps {
  title: string;
  description?: string;
  status: "pending" | "active" | "done";
}

export function PickingStep({ title, description, status }: PickingStepProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {status === "done" ? (
        <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
      ) : status === "active" ? (
        <PlayCircle className="mt-1 h-5 w-5 text-blue-500" />
      ) : (
        <Circle className="mt-1 h-5 w-5 text-muted-foreground" />
      )}
      <div>
        <p className="font-semibold leading-tight">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
