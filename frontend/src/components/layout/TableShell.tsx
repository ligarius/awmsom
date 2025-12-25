import { ContentSection } from "@/components/layout/ContentSection";
import { EmptyState } from "@/components/layout/EmptyState";
import { LoadingState } from "@/components/layout/LoadingState";
import { cn } from "@/lib/utils";

interface TableShellProps {
  title?: string;
  description?: string;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
  children?: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  className?: string;
}

export function TableShell({
  title,
  description,
  toolbar,
  pagination,
  children,
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  errorTitle = "No se pudo cargar la tabla",
  errorDescription = "Intenta de nuevo o revisa la conexion.",
  className
}: TableShellProps) {
  return (
    <ContentSection title={title} description={description} className={className} contentClassName="pt-3">
      {toolbar ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3">{toolbar}</div> : null}
      <div className={cn("rounded-lg border bg-background", isLoading || isError || isEmpty ? "p-4" : "p-0")}>
        {isLoading ? (
          <LoadingState message="Cargando datos..." className="border-0 bg-transparent p-0" />
        ) : isError ? (
          <EmptyState title={errorTitle} description={errorDescription} className="border-0 bg-transparent p-0" />
        ) : isEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} className="border-0 bg-transparent p-0" />
        ) : (
          children
        )}
      </div>
      {pagination ? <div className="mt-3">{pagination}</div> : null}
    </ContentSection>
  );
}
