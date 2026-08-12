import { pct } from '@/lib/format';
import type { Weights } from '@/types';

const SIGNALS: { key: keyof Weights; label: string; color: string }[] = [
  { key: 'faculty', label: 'Faculty', color: 'var(--series-2)' },
  { key: 'ai', label: 'AI analysis', color: 'var(--series-5)' },
  { key: 'student', label: 'Student data', color: 'var(--series-1)' },
];

/** Horizontal stacked bar + legend showing the three-signal weighting. */
export function SignalWeights({ weights }: { weights: Weights }) {
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {SIGNALS.map((s) => (
          <div
            key={s.key}
            style={{ width: `${weights[s.key] * 100}%`, background: s.color }}
            className="h-full transition-[width] duration-500"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SIGNALS.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="ml-auto text-xs font-semibold tabular-nums">{pct(weights[s.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
