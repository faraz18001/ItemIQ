import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
    <Card className={cn('gap-0 p-4', className)}>
      <div className="flex items-start justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {label}
          {help && <HelpHint id={help} />}
        </p>
        {Icon && (
          <span
            className="grid size-8 place-items-center rounded-lg"
            style={{ background: accent ? `color-mix(in oklab, ${accent}, transparent 88%)` : 'var(--muted)', color: accent ?? 'var(--muted-foreground)' }}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {trend && (
          <span className={cn('mb-1 text-xs font-medium', trend.positive ? 'text-success' : 'text-critical')}>
            {trend.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
