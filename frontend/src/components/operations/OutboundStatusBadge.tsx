import { cn } from "@/lib/utils";
import type { OutboundStatus } from "@/types/operations";

const variants: Record<OutboundStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100",
  RELEASED: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100",
  PARTIALLY_ALLOCATED: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  FULLY_ALLOCATED: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  PICKING: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-100",
  PARTIALLY_PICKED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  PICKED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  CANCELLED: "bg-gray-200 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100"
};

export function OutboundStatusBadge({ status }: { status: OutboundStatus }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", variants[status])}>{status}</span>;
}
