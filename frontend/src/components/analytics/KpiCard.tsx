"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  helper?: string;
  trend?: {
    label: string;
    value: string;
    positive?: boolean;
  };
  icon?: LucideIcon;
  emphasis?: "default" | "success" | "warning" | "danger";
  footer?: React.ReactNode;
}

const emphasisMap: Record<NonNullable<KpiCardProps["emphasis"]>, string> = {
  default: "border-muted",
  success: "border-emerald-500/50 bg-emerald-500/5",
  warning: "border-amber-500/50 bg-amber-500/5",
  danger: "border-destructive/50 bg-destructive/5"
};

export function KpiCard({
  title,
  value,
  description,
  helper,
  trend,
  icon: Icon,
  emphasis = "default",
  footer
}: KpiCardProps) {
  return (
    <Card className={cn("h-full", emphasisMap[emphasis])}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-semibold leading-none tracking-tight">{value}</div>
            {trend ? (
              <Badge
                variant={trend.positive ? "default" : "destructive"}
                className="rounded-full px-2 py-0 text-xs font-medium"
              >
                {trend.label}: {trend.value}
              </Badge>
            ) : null}
          </div>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {Icon ? (
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
        {footer}
      </CardContent>
    </Card>
  );
}
