import { cn } from "@/lib/utils";
import type { WaveStatus } from "@/types/operations";

const variants: Record<WaveStatus, string> = {
  CREATED: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-100",
  PLANNED: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100",
  RELEASED: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  PICKING: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-100",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100"
};

export function WaveStatusBadge({ status }: { status: WaveStatus }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", variants[status])}>{status}</span>;
}
