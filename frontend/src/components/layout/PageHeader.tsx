import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({ title, description, actions, backHref, backLabel = "Volver", className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {backHref ? (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref} aria-label={backLabel}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        <div>
          <h1 className="text-xl font-display font-semibold leading-tight text-foreground md:text-2xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
