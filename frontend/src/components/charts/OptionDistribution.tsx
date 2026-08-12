import { pct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';

/**
 * Per-option response distribution — correct option highlighted, others as
 * distractors. Defaults to the item's lifetime picks; pass ``picks`` to show
 * one sitting's own distribution instead.
 */
export function OptionDistribution({ question, picks: override }: { question: Question; picks?: number[] | null }) {
  const picks = override ?? question.stats?.optionPicks;
  const total = picks ? picks.reduce((s, v) => s + v, 0) : 0;
  if (!picks || total === 0) {
    return <p className="text-sm text-muted-foreground">No response data yet.</p>;
  }
  const max = Math.max(...picks);
  return (
    <div className="space-y-2.5">
      {question.options.map((opt, i) => {
        const count = picks[i] ?? 0;
        const share = count / total;
        const isCorrect = opt.isCorrect;
        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded text-[11px] font-semibold',
                  isCorrect ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {opt.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{opt.text}</span>
              <span className="tabular-nums text-muted-foreground">{count} · {pct(share)}</span>
            </div>
            <div className="ml-7 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', isCorrect ? 'bg-success' : 'bg-series-6')}
                style={{ width: `${max ? (count / max) * 100 : 0}%`, background: isCorrect ? 'var(--success)' : 'var(--series-6)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
