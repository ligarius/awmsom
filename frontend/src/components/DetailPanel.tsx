interface DetailPanelProps {
  title: string;
  entries: { label: string; value?: React.ReactNode }[];
  footer?: React.ReactNode;
}

export function DetailPanel({ title, entries, footer }: DetailPanelProps) {
  return (
    <aside className="rounded-lg border bg-background shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="space-y-3 p-4 text-sm">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{entry.label}</span>
            <span className="font-medium">{entry.value ?? "—"}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="border-t bg-muted/50 p-3">{footer}</div> : null}
    </aside>
  );
}
