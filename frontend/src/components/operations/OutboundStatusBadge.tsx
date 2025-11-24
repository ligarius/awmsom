import { cn } from "@/lib/utils";
import type { OutboundStatus } from "@/types/operations";

const variants: Record<OutboundStatus, string> = {
  CREATED: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100",
  RELEASED: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100",
  PICKING: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  PACKED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  SHIPPED: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
};

export function OutboundStatusBadge({ status }: { status: OutboundStatus }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", variants[status])}>{status}</span>;
}
