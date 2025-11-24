"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_SECTIONS } from "@/lib/constants";
import { useUiStore } from "@/store/ui.store";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";

function resolveIcon(name: string) {
  const Icon = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.LayoutGrid;
  return <Icon className="h-4 w-4" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUiStore();

  return (
    <aside
      className={cn(
        "relative flex h-full w-64 flex-shrink-0 flex-col border-r bg-sidebar text-white transition-all",
        sidebarOpen ? "" : "-ml-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400">AWMS</div>
          <div className="text-lg font-semibold">Operations Hub</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {APP_SECTIONS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="block">
              <Button
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 text-sm",
                  active ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
                )}
              >
                {resolveIcon(item.icon)}
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-6 text-xs text-slate-400">
        Próximos módulos: inbound, outbound, inventario y configuración.
      </div>
    </aside>
  );
}
