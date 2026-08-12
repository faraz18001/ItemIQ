import { CheckCircle2, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DifficultyBadge, DifficultyScore, StatusBadge } from './Badges';
import { AiItemReview } from './AiItemReview';
import { SignalWeights } from '@/components/charts/SignalWeights';
import { ICCChart } from '@/components/charts/ICCChart';
import { OptionDistribution } from '@/components/charts/OptionDistribution';
import { discriminationBand, bBand, qualityFlags } from '@/lib/engine';
import { formatDateTime, num, pct } from '@/lib/format';
import { useData } from '@/context/DataContext';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';

export function QuestionDetailDialog({
  question, open, onOpenChange,
}: {
  question: Question | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { userById } = useData();
  if (!question) return null;
  const q = question;
  const flags = qualityFlags(q.discriminationStatus, q.attemptCount, q.contradiction, q.stats?.nonfunctionalDistractors);
  const disc = q.irt ? discriminationBand(q.irt.a) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">{q.publicId}</Badge>
            <StatusBadge status={q.status} />
            <DifficultyBadge level={q.difficultyTag} />
            <DifficultyScore score={q.difficultyScore} weights={q.weights} attempts={q.attemptCount} />
            {q.status === 'in_bank' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Locked</span>
            )}
          </div>
          <DialogTitle className="mt-1 text-base leading-relaxed font-medium">{q.stem}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {q.subjectName} · {q.topicName} · {q.subtopicName}
          </p>
        </DialogHeader>

        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
            <TabsTrigger value="difficulty" className="flex-1">Difficulty</TabsTrigger>
            <TabsTrigger value="review" className="flex-1">AI review</TabsTrigger>
            <TabsTrigger value="irt" className="flex-1">Psychometrics</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4 space-y-3">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-sm',
                  opt.isCorrect ? 'border-success/40 bg-success/8' : 'border-border',
                )}
              >
                <span className={cn('grid size-6 shrink-0 place-items-center rounded font-semibold', opt.isCorrect ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                  {opt.label}
                </span>
                <span className="flex-1">{opt.text}</span>
                {opt.isCorrect && <CheckCircle2 className="size-4 shrink-0 text-success" />}
              </div>
            ))}
            {q.explanation && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="mb-1 font-medium">Explanation</p>
                <p className="text-muted-foreground">{q.explanation}</p>
              </div>
            )}
            {q.reference && <p className="text-xs text-muted-foreground">Reference: {q.reference}</p>}
          </TabsContent>

          <TabsContent value="difficulty" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Signal weighting</span>
                <span className="text-xs text-muted-foreground">{q.attemptCount} attempts</span>
              </div>
              {q.weights && <SignalWeights weights={q.weights} />}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric label="Faculty" value={q.facultyDifficulty} />
              <Metric label="AI" value={q.aiDifficulty} />
              <Metric
                label="Final tag"
                value={q.difficultyTag}
                sub={`${(q.difficultyScore * 10).toFixed(1)} / 10`}
                highlight
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="mb-1 font-medium">AI reasoning</p>
              <p className="text-muted-foreground">{q.aiReasoning}</p>
            </div>
            {flags.map((f) => (
              <div key={f.key} className={cn(
                'rounded-lg border p-3 text-sm',
                f.tone === 'critical' ? 'border-critical/40 bg-critical/8' : f.tone === 'serious' ? 'border-serious/40 bg-serious/8' : 'border-warning/40 bg-warning/8',
              )}>
                <p className="font-medium">{f.label}</p>
                <p className="text-muted-foreground">{f.detail}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="review" className="mt-4">
            {/* Keyed off the question id so switching items in the bank clears
                the previous item's critique rather than showing it against the
                new one. */}
            <AiItemReview
              key={q.id}
              target={{ questionId: q.id }}
              hint="Reviews this item for giveaway cues, a disputable key, and what may trip students up. Runs on demand."
            />
          </TabsContent>

          <TabsContent value="irt" className="mt-4 space-y-4">
            {q.irt ? (
              <>
                <div className="rounded-lg border border-border p-3">
                  <ICCChart irt={q.irt} curve={q.iccCurve} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Discrimination (a)" value={num(q.irt.a)} sub={disc?.label} />
                  <Metric label="Difficulty (b)" value={num(q.irt.b)} sub={bBand(q.irt.b) ?? undefined} />
                  <Metric label="Guessing (c)" value={num(q.irt.c)} />
                </div>
                {q.stats && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">n = {q.attemptCount} attempts</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="p-value" value={pct(q.stats.pValue)} />
                      <Metric label="Discrim. index" value={num(q.stats.discriminationIndex)} />
                      <Metric label="Point-biserial" value={num(q.stats.pointBiserial)} />
                      <Metric label="Distractor eff." value={pct(q.stats.distractorEfficiency)} />
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm font-medium">Response distribution</p>
                  <OptionDistribution question={q} />
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No student response data yet. The difficulty tag rests on the faculty and AI signals until attempts accumulate.
              </p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            <div className="text-xs text-muted-foreground">
              Author: {userById(q.authorId)?.name ?? 'N/A'} · Created {formatDateTime(q.createdAt)}
            </div>
            <Separator />
            {q.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No review activity recorded.</p>
            ) : (
              <ol className="space-y-3">
                {q.reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">
                        {r.stage === 'departmental' ? 'SME review' : 'Final review'}: {r.decision.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                    </div>
                    <p className="text-muted-foreground">{r.remarks}</p>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3', highlight ? 'border-primary/40 bg-accent/40' : 'border-border')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
