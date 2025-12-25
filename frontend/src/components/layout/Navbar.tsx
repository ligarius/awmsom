"use client";

import { ArrowLeftCircle, Menu, Sun, MoonStar, LogOut } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { buildBreadcrumbs } from "@/lib/utils";
import { useAuthContext } from "@/providers/AuthProvider";
import { useUiStore } from "@/store/ui.store";
import { canAccessSaas } from "@/lib/navigation";

export function Navbar() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);
  const { user, logout } = useAuthContext();
  const { theme: uiTheme, setTheme: setUiTheme, toggleSidebar } = useUiStore();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = searchParams.get("tenantId");
  const isTenantView = Boolean(tenantId && canAccessSaas(user));
  const clearTenantContext = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("awms_active_tenant");
    }
    router.push("/saas");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-2">
              <a href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </a>
              {index < breadcrumbs.length - 1 && <span className="text-xs">/</span>}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const nextTheme = theme === "dark" ? "light" : "dark";
            setTheme(nextTheme);
            setUiTheme(nextTheme as typeof uiTheme);
          }}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {user?.fullName?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="hidden flex-col text-left text-sm sm:flex">
                <span className="font-medium">{user?.fullName ?? "Usuario"}</span>
                <span className="text-xs text-muted-foreground">{user?.tenant ?? "Tenant"}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            {isTenantView ? (
              <DropdownMenuItem onClick={clearTenantContext}>
                <ArrowLeftCircle className="mr-2 h-4 w-4" /> Salir vista tenant
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
