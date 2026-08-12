import { Badge } from '@/components/ui/badge';
import { STATUS_META, REQUEST_STATUS_META, type Tone } from '@/data/roles';
import { cn } from '@/lib/utils';
import type { Difficulty, QuestionStatus, Weights } from '@/types';

export function StatusBadge({ status }: { status: QuestionStatus }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge variant={meta.tone}>{meta.label}</Badge>;
}

export function RequestStatusBadge({ status }: { status: string }) {
  const meta = REQUEST_STATUS_META[status] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge variant={meta.tone}>{meta.label}</Badge>;
}

const DIFFICULTY_DOT: Record<Difficulty, string> = {
  Easy: 'bg-easy',
  Medium: 'bg-medium',
  Hard: 'bg-hard',
};

export function DifficultyBadge({ level, className }: { level: Difficulty; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', DIFFICULTY_DOT[level])} />
      {level}
    </span>
  );
}

/**
 * The difficulty score on a 1–10 scale, to sit *behind* the label rather than
 * replace it.
 *
 * The label is what survives being skimmed; this is what tells two Mediums
 * apart when an examiner is balancing a paper. `score` is the stored 0–1
 * value — no new measurement, just the one the engine already computes.
 *
 * It is never shown naked, because the same number means two different things.
 * With no student data the blend is half the author's label and half the AI's,
 * each drawn from three fixed values, so a new item can only land on a handful
 * of scores and never near either end. Once responses accumulate the score is
 * IRT-derived and spans the full range. Reading "5.0" as a measurement in the
 * first case would be reading a guess as evidence, so the basis travels with
 * the number — muted and qualified until real data is behind it.
 */
export function DifficultyScore({
  score, weights, attempts, className,
}: {
  score: number | null | undefined;
  /** Used only to tell whether student data is in the blend. */
  weights?: Weights;
  attempts?: number;
  className?: string;
}) {
  if (score == null || Number.isNaN(score)) return null;

  const fromStudents = (weights?.student ?? 0) > 0;
  const basis = fromStudents
    ? `from ${attempts ?? 0} response${attempts === 1 ? '' : 's'}`
    : 'faculty and AI only';

  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 text-xs tabular-nums',
        fromStudents ? 'font-medium text-foreground' : 'text-muted-foreground',
        className,
      )}
      title={
        fromStudents
          ? `Difficulty ${(score * 10).toFixed(1)} of 10, weighted ${Math.round((weights?.student ?? 0) * 100)}% on student responses.`
          : `Difficulty ${(score * 10).toFixed(1)} of 10, from the author's estimate and the AI signal. No student responses yet, so this is a judgement rather than a measurement.`
      }
    >
      <span>{(score * 10).toFixed(1)}<span className="text-muted-foreground">/10</span></span>
      <span className="text-[11px] font-normal text-muted-foreground">· {basis}</span>
    </span>
  );
}
