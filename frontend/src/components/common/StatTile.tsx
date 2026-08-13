import type { LucideIcon } from 'lucide-react';
import { HelpHint } from '@/components/common/HelpHint';
import type { HelpId } from '@/data/help';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Short subtitle under the value. */
  hint?: string;
  /** Shows a `?` beside the label explaining the statistic. */
  help?: HelpId;
  trend?: { value: string; positive?: boolean };
  accent?: string;
  className?: string;
}

export function StatTile({ label, value, icon: Icon, hint, help, trend, accent, className }: StatTileProps) {
  return (
    <div className={cn('border-t-2 border-border pt-4 pb-2', className)}>
      <div className="flex items-start justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
          {help && <HelpHint id={help} />}
        </p>
        {Icon && (
          <span
            className="grid size-6 place-items-center rounded-none"
            style={{ color: accent ?? 'var(--muted-foreground)' }}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">{value}</span>
        {trend && (
          <span className={cn('mb-1 text-xs font-medium', trend.positive ? 'text-success' : 'text-critical')}>
            {trend.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
