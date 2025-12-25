"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAV_SECTIONS } from "@/lib/constants";
import { useUiStore } from "@/store/ui.store";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/providers/AuthProvider";
import { canAccessSaas } from "@/lib/navigation";
import { useApi } from "@/hooks/useApi";
import { resolvePlanCode, resolvePlanTier } from "@/lib/plans";
import type { PlanCode } from "@/lib/plans";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

function resolveIcon(name: string) {
  const normalized = name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
  const Icon =
    (Icons as Record<string, React.ComponentType<{ className?: string }>>)[normalized] ??
    (Icons as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    Icons.LayoutGrid;
  return <Icon className="h-4 w-4" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();
  const { user } = useAuthContext();
  const { get } = useApi();
  const showSaas = canAccessSaas(user);
  const tenantParam = searchParams.get("tenantId");
  const isPlatform = canAccessSaas(user);
  const effectiveTenantId = tenantParam ?? (!isPlatform ? user?.tenantId ?? null : null);
  const [planCode, setPlanCode] = useState<PlanCode | null>(null);

  useEffect(() => {
    if (!effectiveTenantId) {
      setPlanCode(null);
      return;
    }

    const endpoint = isPlatform && tenantParam ? `/saas/tenants/${effectiveTenantId}` : `/tenants/${effectiveTenantId}`;
    get<{ plan?: string; planCode?: string }>(endpoint)
      .then((data) => setPlanCode(resolvePlanCode(data.planCode ?? data.plan)))
      .catch(() => setPlanCode(null));
  }, [effectiveTenantId, get, isPlatform, tenantParam]);

  const planTier = effectiveTenantId ? resolvePlanTier(planCode ?? "BASIC") : Number.MAX_SAFE_INTEGER;
  const sections = useMemo(
    () => (showSaas ? APP_NAV_SECTIONS : APP_NAV_SECTIONS.filter((section) => section.label !== "SaaS")),
    [showSaas]
  );

  const resolveHref = (href: string, sectionLabel: string) => {
    if (!tenantParam || sectionLabel === "SaaS") return href;
    return `${href}?tenantId=${tenantParam}`;
  };

  return (
    <aside
      className={cn(
        "relative flex h-full flex-shrink-0 flex-col border-r bg-sidebar text-white transition-all",
        sidebarCollapsed ? "w-20" : "w-64",
        sidebarOpen ? "" : "-ml-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <div className={cn("space-y-1", sidebarCollapsed && "sr-only")}>
          <div className="text-xs uppercase tracking-widest text-slate-400">AWMS</div>
          <div className="text-lg font-semibold">Operations Hub</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebarCollapsed}
          className={cn("hidden lg:inline-flex", sidebarCollapsed ? "text-slate-300" : "text-slate-200")}
          aria-label={sidebarCollapsed ? "Expandir menu" : "Compactar menu"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {sections.map((section) => {
          const activeHref = section.items
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0]?.href;
          return (
            <div key={section.label} className="space-y-2">
              <div className={cn("px-2 text-[11px] uppercase tracking-[0.2em] text-slate-400", sidebarCollapsed && "sr-only")}>
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = item.href === activeHref;
                  const minTier = item.minPlan ? resolvePlanTier(item.minPlan) : 0;
                  const isAllowed = section.label === "SaaS" ? true : planTier >= minTier;
                  const displayHref = resolveHref(item.href, section.label);
                  const buttonLabel = (
                    <span className={cn("truncate", sidebarCollapsed && "sr-only")}>{item.label}</span>
                  );

                  const buttonContent = (
                    <>
                      {resolveIcon(item.icon)}
                      {buttonLabel}
                      {!sidebarCollapsed && !isAllowed ? <Lock className="ml-auto h-3.5 w-3.5 text-slate-400" /> : null}
                    </>
                  );

                  if (!isAllowed) {
                    return (
                      <div key={item.href} className="block">
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-2 text-sm opacity-60",
                            sidebarCollapsed && "justify-center"
                          )}
                          title={`${item.label} disponible en planes superiores`}
                          aria-label={sidebarCollapsed ? item.label : undefined}
                          disabled
                        >
                          {buttonContent}
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <Link key={item.href} href={displayHref} className="block">
                      <Button
                        variant={active ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2 text-sm",
                          sidebarCollapsed && "justify-center",
                          active ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                        aria-label={sidebarCollapsed ? item.label : undefined}
                      >
                        {buttonContent}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className={cn("px-4 pb-6 text-xs text-slate-400", sidebarCollapsed && "sr-only")}>
        Próximos módulos: inbound, outbound, inventario y configuración.
      </div>
    </aside>
  );
}
