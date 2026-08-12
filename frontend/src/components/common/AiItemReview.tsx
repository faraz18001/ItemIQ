/**
 * On-demand AI review of a single item, shared by the authoring form and the
 * reviewer's question dialog.
 *
 * Not automatic, unlike the difficulty signal next to it in the authoring
 * panel: this is one real LLM call per press, and a half-written stem has
 * nothing worth reviewing. The author decides when the item is ready to look at.
 */

import { useState } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Loader2,
  ScanSearch, ShieldAlert, Sparkles, TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface AiCritique {
  verdict: 'sound' | 'minor_revision' | 'major_revision';
  summary: string;
  strengths: string[];
  issues: { area: string; severity: 'low' | 'medium' | 'high'; detail: string; fix: string }[];
  traps: { detail: string; fair: boolean }[];
  harder: string;
  easier: string;
  provider: string;
}

/** What to review: a saved question, or the draft currently in the form. */
export type AiReviewTarget =
  | { questionId: string }
  | { stem: string; options: string[]; correct?: number; explanation?: string };

const VERDICT: Record<AiCritique['verdict'], { label: string; variant: 'good' | 'warning' | 'serious' }> = {
  sound: { label: 'Sound as written', variant: 'good' },
  minor_revision: { label: 'Minor revision', variant: 'warning' },
  major_revision: { label: 'Major revision', variant: 'serious' },
};

const SEVERITY: Record<string, 'neutral' | 'warning' | 'critical'> = {
  low: 'neutral',
  medium: 'warning',
  high: 'critical',
};

export function AiItemReview({ target, disabled, hint }: {
  target: AiReviewTarget;
  /** True while the draft is too incomplete to be worth sending. */
  disabled?: boolean;
  hint?: string;
}) {
  const [result, setResult] = useState<AiCritique | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<{ message: string; unavailable: boolean } | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await api.post<AiCritique>('/ai/critique', target));
    } catch (err) {
      // 503 means the capability is off or the provider is down, which is an
      // admin problem and worth wording differently from a genuine failure.
      const unavailable = err instanceof ApiError && err.status === 503;
      setError({
        message: err instanceof Error ? err.message : 'The review could not be completed.',
        unavailable,
      });
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant={result ? 'outline' : 'default'} onClick={run} disabled={running || disabled}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          {running ? 'Reviewing…' : result ? 'Review again' : 'Run AI review'}
        </Button>
        {result && (
          <Badge variant={VERDICT[result.verdict].variant}>{VERDICT[result.verdict].label}</Badge>
        )}
      </div>

      {!result && !error && !running && (
        <p className="text-sm text-muted-foreground">
          {hint ?? 'Checks the item for giveaway cues, a disputable key, and what may trip students up.'}
        </p>
      )}

      {error && (
        <div className={cn(
          'flex items-start gap-2 rounded-lg border p-3 text-sm',
          error.unavailable ? 'border-border bg-muted/40' : 'border-critical/40 bg-critical/8',
        )}>
          {error.unavailable
            ? <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />}
          <div>
            <p className="font-medium">
              {error.unavailable ? 'AI review is not switched on' : 'The review failed'}
            </p>
            <p className="mt-0.5 text-muted-foreground">{error.message}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 text-sm">
          <p>{result.summary}</p>

          {result.strengths.length > 0 && (
            <Section icon={<CheckCircle2 className="size-4 text-success" />} title="Strengths">
              <ul className="space-y-1.5">
                {result.strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-muted-foreground">
                    <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {result.issues.length > 0 && (
            <Section icon={<TriangleAlert className="size-4 text-warning" />} title="Recommendations">
              <div className="space-y-2.5">
                {result.issues.map((issue) => (
                  <div key={issue.detail} className="rounded-lg border border-border p-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{issue.area}</Badge>
                      <Badge variant={SEVERITY[issue.severity] ?? 'neutral'} className="capitalize">
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{issue.detail}</p>
                    <p className="mt-1.5">
                      <span className="font-medium">Suggested fix: </span>
                      <span className="text-muted-foreground">{issue.fix}</span>
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.traps.length > 0 && (
            <Section icon={<ShieldAlert className="size-4 text-serious" />} title="What may trip students up">
              <div className="space-y-2">
                {result.traps.map((trap) => (
                  <div key={trap.detail} className="flex items-start gap-2">
                    <Badge variant={trap.fair ? 'good' : 'serious'} className="mt-0.5 shrink-0">
                      {trap.fair ? 'Fair' : 'Unfair'}
                    </Badge>
                    <span className="text-muted-foreground">{trap.detail}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(result.harder || result.easier) && (
            <>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2">
                {result.harder && (
                  <Adjust icon={<ArrowUpRight className="size-4" />} title="To make it harder" body={result.harder} />
                )}
                {result.easier && (
                  <Adjust icon={<ArrowDownRight className="size-4" />} title="To make it easier" body={result.easier} />
                )}
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Generated by {result.provider}. A suggestion for the author to weigh, not a review decision.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-medium">{icon}{title}</div>
      {children}
    </div>
  );
}

function Adjust({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{title}</div>
      <p>{body}</p>
    </div>
  );
}
