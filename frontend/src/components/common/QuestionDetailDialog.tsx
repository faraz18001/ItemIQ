import { useState } from 'react';
import { MarkdownStem } from './MarkdownStem';
import { CheckCircle2, Lock, Image, BookOpenCheck, ChevronDown, ChevronUp } from 'lucide-react';
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
import type { Question, QuestionSubPart } from '@/types';

// ── Extracted image gallery ───────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

function QuestionImageGallery({ images }: { images: string[] }) {
  if (!images || images.length === 0) return null;
  return (
    <div className="my-3 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Image className="size-3.5" /> Extracted diagrams
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <a
            key={i}
            href={`${API_BASE}/uploads/extracted_images/${img}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-border bg-muted hover:border-primary/50 transition-colors"
          >
            <img
              src={`${API_BASE}/uploads/extracted_images/${img}`}
              alt={`Diagram ${i + 1}`}
              className="max-h-56 max-w-full object-contain transition-transform group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground px-2 py-1 truncate">
              {img}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── MCQ options list ──────────────────────────────────────────────────────────

function McqOptions({ options }: { options: Question['options'] }) {
  if (!options || options.length === 0) return null;
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div
          key={opt.id}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
            opt.isCorrect
              ? 'border-success/40 bg-success/8 shadow-sm'
              : 'border-border hover:bg-muted/40',
          )}
        >
          <span
            className={cn(
              'grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold',
              opt.isCorrect
                ? 'bg-success/20 text-success'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {opt.label}
          </span>
          <span className="flex-1 leading-relaxed">{opt.text}</span>
          {opt.isCorrect && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
        </div>
      ))}
    </div>
  );
}

// ── SAQ sub-parts table ───────────────────────────────────────────────────────

function SaqSubParts({ subParts, markingScheme }: { subParts: QuestionSubPart[]; markingScheme?: string | null }) {
  const [open, setOpen] = useState(false);

  if (!subParts || subParts.length === 0) {
    // No sub-parts: show raw rubric if available
    if (!markingScheme) return null;
    return <MarkSchemeRubric rubric={markingScheme} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-parts</p>
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {subParts.map((sp, i) => (
          <div key={i} className="p-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono text-muted-foreground">
                {sp.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{sp.text}</p>
                {sp.marks > 0 && (
                  <span className="mt-1 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {sp.marks} mark{sp.marks !== 1 ? 's' : ''}
                  </span>
                )}
                {sp.rubric && (
                  <p className="mt-2 rounded-lg bg-success/8 border border-success/20 px-3 py-2 text-xs text-success leading-relaxed">
                    <span className="font-semibold">Model answer: </span>{sp.rubric}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full raw mark scheme toggle */}
      {markingScheme && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <BookOpenCheck className="size-3.5" />
          <span className="flex-1 text-left">Full mark scheme rubric</span>
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      )}
      {open && markingScheme && <MarkSchemeRubric rubric={markingScheme} />}
    </div>
  );
}

function MarkSchemeRubric({ rubric }: { rubric: string }) {
  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-success uppercase tracking-wide">
        <BookOpenCheck className="size-3.5" /> Mark scheme
      </p>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{rubric}</p>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

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
  const isMcq = q.type === 'MCQ' || (q.options && q.options.length > 0);
  const hasStem = q.stem && q.stem.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {/* ── Header ── */}
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">{q.publicId}</Badge>
            <Badge variant="outline" className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              {q.type ?? 'MCQ'}
            </Badge>
            <StatusBadge status={q.status} />
            <DifficultyBadge level={q.difficultyTag} />
            <DifficultyScore score={q.difficultyScore} weights={q.weights} attempts={q.attemptCount} />
            {q.status === 'in_bank' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" /> Locked
              </span>
            )}
          </div>

          {/* Breadcrumb */}
          <p className="text-[11px] text-muted-foreground mt-1">
            {[q.subjectName, q.topicName, q.subtopicName].filter(Boolean).join(' · ')}
          </p>

          {/* Stem */}
          {hasStem && (
            <div className="mt-2">
              <MarkdownStem className="text-base leading-relaxed font-medium">
                {q.stem}
              </MarkdownStem>
            </div>
          )}
        </DialogHeader>

        {/* ── Tabs ── */}
        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
            <TabsTrigger value="difficulty" className="flex-1">Difficulty</TabsTrigger>
            <TabsTrigger value="review" className="flex-1">AI review</TabsTrigger>
            <TabsTrigger value="irt" className="flex-1">Psychometrics</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>

          {/* ── Content tab ── */}
          <TabsContent value="content" className="mt-4 space-y-4">
            {/* Extracted diagrams */}
            <QuestionImageGallery images={q.images ?? []} />

            {/* Options (MCQ) OR Sub-parts (SAQ) */}
            {isMcq ? (
              <McqOptions options={q.options} />
            ) : (
              <SaqSubParts subParts={q.subParts ?? []} markingScheme={q.markingScheme as string | null | undefined} />
            )}

            {/* If MCQ and has a marking scheme, show it collapsed */}
            {isMcq && q.markingScheme && (
              <MarkSchemeRubric rubric={q.markingScheme as string} />
            )}

            {/* Explanation */}
            {q.explanation && (
              <div className="rounded-xl bg-muted/50 p-4 text-sm">
                <p className="mb-1 font-semibold">Explanation</p>
                <p className="text-muted-foreground leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {/* Reference */}
            {q.reference && (
              <p className="text-xs text-muted-foreground">
                📄 Reference: <span className="font-mono">{q.reference}</span>
              </p>
            )}
          </TabsContent>

          {/* ── Difficulty tab ── */}
          <TabsContent value="difficulty" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Signal weighting</span>
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
            <div className="rounded-xl bg-muted/50 p-4 text-sm">
              <p className="mb-1 font-semibold">AI reasoning</p>
              <p className="text-muted-foreground leading-relaxed">{q.aiReasoning}</p>
            </div>
            {flags.map((f) => (
              <div key={f.key} className={cn(
                'rounded-xl border p-3 text-sm',
                f.tone === 'critical' ? 'border-critical/40 bg-critical/8' :
                f.tone === 'serious' ? 'border-serious/40 bg-serious/8' : 'border-warning/40 bg-warning/8',
              )}>
                <p className="font-medium">{f.label}</p>
                <p className="text-muted-foreground">{f.detail}</p>
              </div>
            ))}
          </TabsContent>

          {/* ── AI review tab ── */}
          <TabsContent value="review" className="mt-4">
            <AiItemReview
              key={q.id}
              target={{ questionId: q.id }}
              hint="Reviews this item for giveaway cues, a disputable key, and what may trip students up. Runs on demand."
            />
          </TabsContent>

          {/* ── Psychometrics tab ── */}
          <TabsContent value="irt" className="mt-4 space-y-4">
            {q.irt ? (
              <>
                <div className="rounded-xl border border-border p-3">
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
                  <p className="mb-2 text-sm font-semibold">Response distribution</p>
                  <OptionDistribution question={q} />
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No student response data yet. The difficulty tag rests on the faculty and AI signals until attempts accumulate.
              </p>
            )}
          </TabsContent>

          {/* ── History tab ── */}
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
                  <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">
                        {r.stage === 'departmental' ? 'SME review' : 'Final review'}:{' '}
                        {r.decision.replace('_', ' ')}
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

// ── Shared metric card ────────────────────────────────────────────────────────

function Metric({
  label, value, sub, highlight,
}: {
  label: string; value: React.ReactNode; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border p-3', highlight ? 'border-primary/40 bg-accent/40' : 'border-border')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
