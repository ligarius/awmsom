"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

interface TenantShellProps {
  tenantId: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function TenantShell({ tenantId, title, description, actions, children }: TenantShellProps) {
  const pathname = usePathname();
  const navItems = [
    { label: "Resumen", href: `/saas/tenants/${tenantId}` },
    { label: "Usuarios", href: `/saas/tenants/${tenantId}/users` },
    { label: "Procesos WMS", href: `/saas/tenants/${tenantId}/processes` }
  ];

  return (
    <PageShell size="wide">
      <PageHeader title={title} description={description} backHref="/saas/tenants" actions={actions} />
      <div className="rounded-lg border bg-card p-2 shadow-panel">
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-control-sm items-center rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-panel"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </PageShell>
  );
}
