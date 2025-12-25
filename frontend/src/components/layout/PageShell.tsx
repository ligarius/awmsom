import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

type PageShellSize = "default" | "wide" | "full";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  size?: PageShellSize;
}

const sizeClasses: Record<PageShellSize, string> = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none"
};

export function PageShell({ children, className, contentClassName, size = "default" }: PageShellProps) {
  return (
    <AppShell className={cn("p-0", className)}>
      <div className={cn("mx-auto flex w-full flex-col gap-6 px-6 py-6", sizeClasses[size], contentClassName)}>
        {children}
      </div>
    </AppShell>
  );
}
