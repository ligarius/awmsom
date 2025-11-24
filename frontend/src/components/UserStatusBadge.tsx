import { cn } from "@/lib/utils";

type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

const variantMap: Record<Status, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  INACTIVE: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-100"
};

export function UserStatusBadge({ status }: { status: Status }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", variantMap[status])}>{status}</span>;
}
