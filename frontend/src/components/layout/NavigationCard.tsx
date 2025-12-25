import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationCardProps {
  title: string;
  description?: string;
  href: string;
  meta?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function NavigationCard({
  title,
  description,
  href,
  meta,
  icon,
  className,
  disabled,
  disabledReason
}: NavigationCardProps) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        ) : null}
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
          {disabledReason ? <div className="text-xs text-amber-600">{disabledReason}</div> : null}
        </div>
      </div>
      {disabled ? (
        <Lock className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      )}
    </>
  );

  const containerClass = cn(
    "group flex h-full items-center justify-between rounded-lg border bg-background p-4 shadow-panel transition-colors",
    disabled ? "cursor-not-allowed opacity-70" : "hover:border-primary/40 hover:bg-muted/40",
    className
  );

  if (disabled) {
    return <div className={containerClass}>{content}</div>;
  }

  return (
    <Link href={href} className={containerClass}>
      {content}
    </Link>
  );
}
