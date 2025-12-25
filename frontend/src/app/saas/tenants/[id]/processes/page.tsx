"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  PackageCheck,
  Route,
  ScanLine,
  Ship,
  Truck,
  Warehouse,
  Waves
} from "lucide-react";
import { TenantShell } from "@/components/saas/TenantShell";
import { ContentSection } from "@/components/layout/ContentSection";
import { NavigationCard } from "@/components/layout/NavigationCard";
import { LoadingState } from "@/components/layout/LoadingState";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/components/ui/use-toast";
import type { Tenant } from "@/types/saas";
import { formatPlanLabel, resolvePlanTier } from "@/lib/plans";

export default function TenantProcessesPage() {
  const params = useParams();
  const { get } = useApi();
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    get<Tenant>(`/saas/tenants/${params.id}`)
      .then(setTenant)
      .catch(() => toast({ title: "No pudimos cargar el tenant", variant: "destructive" }));
  }, [get, params.id]);

  if (!tenant) {
    return (
      <TenantShell tenantId={String(params.id)} title="Procesos WMS" description="Cargando procesos por tenant.">
        <LoadingState message="Cargando procesos..." />
      </TenantShell>
    );
  }

  const tenantParam = `?tenantId=${tenant.id}`;
  const planTier = resolvePlanTier(tenant.plan);

  const processLinks = [
    {
      title: "Inbound",
      description: "Recepciones y ASN",
      href: `/inbound${tenantParam}`,
      icon: <Truck className="h-4 w-4" />,
      minPlan: "BASIC"
    },
    {
      title: "Outbound",
      description: "Pedidos y olas de salida",
      href: `/outbound${tenantParam}`,
      icon: <Ship className="h-4 w-4" />,
      minPlan: "BASIC"
    },
    {
      title: "Picking",
      description: "Ejecucion y tareas activas",
      href: `/picking${tenantParam}`,
      icon: <ScanLine className="h-4 w-4" />,
      minPlan: "PRO"
    },
    {
      title: "Packing",
      description: "Empaque y QA",
      href: `/packing${tenantParam}`,
      icon: <PackageCheck className="h-4 w-4" />,
      minPlan: "PRO"
    },
    {
      title: "Inventario",
      description: "Stock, lotes y ubicaciones",
      href: `/inventory${tenantParam}`,
      icon: <Boxes className="h-4 w-4" />,
      minPlan: "BASIC"
    },
    {
      title: "Movimientos",
      description: "Transferencias y ajustes",
      href: `/movements${tenantParam}`,
      icon: <Route className="h-4 w-4" />,
      minPlan: "BASIC"
    },
    {
      title: "Waves",
      description: "Planificacion de olas",
      href: `/waves${tenantParam}`,
      icon: <Waves className="h-4 w-4" />,
      minPlan: "PRO"
    },
    {
      title: "Despachos",
      description: "Rutas y tracking",
      href: `/shipments${tenantParam}`,
      icon: <ClipboardList className="h-4 w-4" />,
      minPlan: "PRO"
    },
    {
      title: "Bodegas",
      description: "Configuracion operativa",
      href: `/settings/warehouses${tenantParam}`,
      icon: <Warehouse className="h-4 w-4" />,
      minPlan: "BASIC"
    }
  ];

  return (
    <TenantShell tenantId={tenant.id} title={`${tenant.name} · Procesos`} description="Accesos rapidos por tenant.">
      <ContentSection title="Procesos WMS" description="Modulos operativos vinculados a este tenant.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {processLinks.map((link) => {
            const requiredTier = resolvePlanTier(link.minPlan);
            const allowed = planTier >= requiredTier;
            const disabledReason = allowed ? undefined : `Disponible en plan ${formatPlanLabel(link.minPlan)}`;
            return (
              <NavigationCard
                key={link.title}
                title={link.title}
                description={link.description}
                href={link.href}
                icon={link.icon}
                disabled={!allowed}
                disabledReason={disabledReason}
              />
            );
          })}
        </div>
      </ContentSection>
    </TenantShell>
  );
}
