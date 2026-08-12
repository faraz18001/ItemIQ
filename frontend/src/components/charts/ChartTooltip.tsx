import type { ReactNode } from 'react';

/** Shared tooltip shell so every chart tooltip reads as one system. */
export function TooltipShell({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {title && <p className="mb-1 font-medium text-foreground">{title}</p>}
      <div className="space-y-0.5 text-muted-foreground">{children}</div>
    </div>
  );
}

export function TooltipRow({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      <span>{label}</span>
      <span className="ml-auto font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}
