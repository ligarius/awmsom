"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const links = [
  { href: "/reports/inbound", title: "Inbound", description: "Recepciones por periodo" },
  { href: "/reports/outbound", title: "Outbound", description: "Órdenes, waves y shipments" },
  { href: "/reports/inventory", title: "Inventario", description: "Stock por SKU/ubicación" },
  { href: "/reports/movements", title: "Movimientos", description: "Movimientos internos" }
];

export default function ReportsHomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reportería integrada</h1>
          <p className="text-sm text-muted-foreground">Exporta CSV o PDF con filtros avanzados.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {link.title}
                  </CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-primary">Ir al reporte</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
