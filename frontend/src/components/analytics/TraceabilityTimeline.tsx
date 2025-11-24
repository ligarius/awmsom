"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: "success" | "warning" | "error" | "info";
  metadata?: string;
}

export function TraceabilityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-3 h-[calc(100%-1.5rem)] w-px bg-border" />
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="relative flex gap-3 rounded-lg border bg-card p-3 shadow-sm">
            <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium leading-none">{item.title}</p>
                {item.status ? (
                  <Badge
                    variant={{ success: "default", warning: "secondary", error: "destructive", info: "outline" }[item.status]}
                  >
                    {item.status}
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</span>
              </div>
              {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
              {item.metadata ? <p className={cn("text-xs text-muted-foreground", "italic")}>{item.metadata}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
