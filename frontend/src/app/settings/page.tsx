"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, ShieldCheck, Users, Warehouse, MapPin, ListChecks } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContentSection } from "@/components/layout/ContentSection";
import { NavigationCard } from "@/components/layout/NavigationCard";
import { useApi } from "@/hooks/useApi";
import { useAuthContext } from "@/providers/AuthProvider";
import { canAccessSaas } from "@/lib/navigation";
import { formatPlanLabel, resolvePlanCode, resolvePlanTier } from "@/lib/plans";
import type { PlanCode } from "@/lib/plans";

const adminLinks = [
  {
    title: "Usuarios",
    description: "Accesos, roles y perfiles del equipo.",
    href: "/settings/users",
    icon: <Users className="h-4 w-4" />
  },
  {
    title: "Roles",
    description: "Permisos por perfil y seguridad.",
    href: "/settings/roles",
    icon: <ShieldCheck className="h-4 w-4" />
  }
];

const masterLinks = [
  {
    title: "Bodegas",
    description: "Datos maestros y capacidad.",
    href: "/settings/warehouses",
    icon: <Warehouse className="h-4 w-4" />
  },
  {
    title: "Zonas",
    description: "Ubicaciones, tipos y configuracion.",
    href: "/settings/zones",
    icon: <MapPin className="h-4 w-4" />
  },
  {
    title: "Motivos de movimiento",
    description: "Lista controlada para movimientos internos.",
    href: "/settings/movement-reasons",
    icon: <ListChecks className="h-4 w-4" />
  }
];

const complianceLinks = [
  {
    title: "Cumplimiento",
    description: "Reglas, retencion y auditorias.",
    href: "/settings/compliance",
    icon: <Building2 className="h-4 w-4" />
  }
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { get } = useApi();
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

  const complianceAllowed = useMemo(() => {
    const tier = resolvePlanTier(planCode ?? "BASIC");
    return tier >= resolvePlanTier("ENTERPRISE");
  }, [planCode]);

  const complianceReason = complianceAllowed ? undefined : `Disponible en plan ${formatPlanLabel("ENTERPRISE")}`;

  return (
    <PageShell>
      <PageHeader title="Configuracion" description="Administra accesos, datos maestros y cumplimiento." />
      <ContentSection title="Administracion" description="Gestiona usuarios y permisos.">
        <div className="grid gap-3 md:grid-cols-2">
          {adminLinks.map((link) => (
            <NavigationCard key={link.title} {...link} />
          ))}
        </div>
      </ContentSection>
      <ContentSection title="WMS maestro" description="Catalogos operativos para el dia a dia.">
        <div className="grid gap-3 md:grid-cols-2">
          {masterLinks.map((link) => (
            <NavigationCard key={link.title} {...link} />
          ))}
        </div>
      </ContentSection>
      <ContentSection title="Cumplimiento" description="Politicas y controles del SaaS.">
        <div className="grid gap-3 md:grid-cols-2">
          {complianceLinks.map((link) => (
            <NavigationCard key={link.title} {...link} disabled={!complianceAllowed} disabledReason={complianceReason} />
          ))}
        </div>
      </ContentSection>
    </PageShell>
  );
}
