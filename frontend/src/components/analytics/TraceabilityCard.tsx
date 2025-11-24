"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TraceabilityCardProps {
  title: string;
  subtitle?: string;
  badges?: string[];
  items: { label: string; value: string | number }[];
  footer?: React.ReactNode;
}

export function TraceabilityCard({ title, subtitle, badges = [], items, footer }: TraceabilityCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {badges.map((badge) => (
              <Badge key={badge} variant="secondary" className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-sm font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
        {footer ? (
          <>
            <div className="border-t" />
            {footer}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
