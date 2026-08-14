/**
 * SubmissionQuestionReview
 *
 * Full-screen drawer opened by QBM during final review.
 * Renders every question from PdfSubmission.extractedJson as an inline card.
 * QBM can Accept ✓ or Reject ✗ each question individually, with a required
 * remark on rejections.  Decisions are auto-saved to the DB on every change.
 * "Final Approve" is only enabled once every question has been reviewed.
 */
import { useState, useEffect, useCallback } from 'react';
import { MarkdownStem } from '@/components/common/MarkdownStem';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, BookOpenCheck, Image, AlertTriangle, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/context/DataContext';
import { cn } from '@/lib/utils';
import type { PdfSubmission, ItemDecision } from '@/types';

// Types matching the extracted_json shape from the parser

interface ExtractedOption {
  label: string;
  text: string;
  is_correct: boolean;
}

interface ExtractedSubPart {
  label: string;
  text: string;
  marks: number;
  rubric?: string;
}

interface ExtractedQuestion {
  id: string;
  q_num: number;
  q_type: 'MCQ' | 'SAQ';
  stem: string;
  marks: number;
  options: ExtractedOption[];
  sub_parts: ExtractedSubPart[];
  images: string[];
  marking_scheme?: string;
}

// Per-question card

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

const OPTION_COLOURS: Record<string, string> = {
  A: 'bg-red-500/15 border-red-300 text-red-700 dark:text-red-400',
  B: 'bg-blue-500/15 border-blue-300 text-blue-700 dark:text-blue-400',
  C: 'bg-emerald-500/15 border-emerald-300 text-emerald-700 dark:text-emerald-400',
  D: 'bg-violet-500/15 border-violet-300 text-violet-700 dark:text-violet-400',
};

function QuestionCard({
  q,
  decision,
  onDecide,
}: {
  q: ExtractedQuestion;
  decision: ItemDecision | undefined;
  onDecide: (d: { decision: 'accepted' | 'rejected'; remark: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [remark, setRemark] = useState(decision?.remark ?? '');

  const decided = !!decision;
  const isAccepted = decision?.decision === 'accepted';
  const isRejected = decision?.decision === 'rejected';

  const accept = () => {
    setShowReject(false);
    onDecide({ decision: 'accepted', remark: '' });
  };

  const confirmReject = () => {
    if (!remark.trim()) {
      toast.error('Please provide a reason before rejecting.');
      return;
    }
    onDecide({ decision: 'rejected', remark: remark.trim() });
    setShowReject(false);
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isAccepted && 'border-success/40 bg-success/5',
        isRejected && 'border-critical/40 bg-critical/5',
        !decided && 'border-border bg-card',
      )}
    >
      {/* ── Card header ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Q number badge */}
        <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-bold font-mono text-muted-foreground min-w-[2.5rem] text-center">
          Q{q.q_num}
        </span>

        {/* Stem + type tag */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
              {q.q_type}
            </Badge>
            {q.marks > 0 && (
              <span className="text-[10px] text-muted-foreground">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            )}
            {q.images?.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Image className="size-3" /> {q.images.length} image{q.images.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <MarkdownStem truncate className="text-sm leading-relaxed line-clamp-3">{q.stem || '(no stem)'}</MarkdownStem>
        </div>

        {/* Decision buttons */}
        <div className="flex shrink-0 items-center gap-2 ml-2">
          {/* Expand toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>

          <Button
            size="sm"
            variant={isAccepted ? 'default' : 'outline'}
            className={cn(
              'h-7 gap-1 text-xs px-3',
              isAccepted
                ? 'bg-success hover:bg-success/90 text-white border-success'
                : 'border-success/40 text-success hover:bg-success/10',
            )}
            onClick={accept}
          >
            <CheckCircle2 className="size-3.5" />
            Accept
          </Button>

          <Button
            size="sm"
            variant={isRejected ? 'destructive' : 'outline'}
            className={cn(
              'h-7 gap-1 text-xs px-3',
              !isRejected && 'border-critical/40 text-critical hover:bg-critical/10',
            )}
            onClick={() => {
              if (isRejected) {
                // Un-reject: re-open the remark box
                setShowReject(true);
              } else {
                setShowReject((v) => !v);
              }
            }}
          >
            <XCircle className="size-3.5" />
            Reject
          </Button>
        </div>
      </div>

      {/* ── Decision status banner ── */}
      {isRejected && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-critical/30 bg-critical/8 px-3 py-2 text-xs text-critical">
          <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
          <span><span className="font-semibold">Rejected: </span>{decision?.remark}</span>
        </div>
      )}

      {/* ── Reject remark input ── */}
      {showReject && (
        <div className="mx-4 mb-3 space-y-2 rounded-xl border border-critical/30 bg-critical/5 p-3">
          <p className="text-xs font-semibold text-critical">Reason for rejection (sent to faculty)</p>
          <Textarea
            autoFocus
            placeholder="e.g. Diagram is missing, stem is ambiguous, wrong answer key..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            className="text-xs resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={confirmReject}>
              Confirm rejection
            </Button>
          </div>
        </div>
      )}

      {/* ── Expanded question body ── */}
      {expanded && (
        <div className="border-t border-border mx-4 mb-4 mt-1 pt-4 space-y-4">
          {/* Extracted images */}
          {q.images?.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Image className="size-3" /> Diagrams
              </p>
              <div className="flex flex-wrap gap-2">
                {q.images.map((img, i) => (
                  <a
                    key={i}
                    href={`${API_BASE}/uploads/extracted_images/${img}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`${API_BASE}/uploads/extracted_images/${img}`}
                      alt={`Q${q.q_num} diagram ${i + 1}`}
                      className="max-h-40 rounded-lg border border-border object-contain hover:scale-105 transition-transform"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* MCQ options */}
          {q.q_type === 'MCQ' && q.options?.length > 0 && (
            <div className="space-y-1.5">
              {q.options.map((opt) => (
                <div
                  key={opt.label}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs',
                    opt.is_correct
                      ? 'border-success/40 bg-success/8'
                      : 'border-border',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold',
                      OPTION_COLOURS[opt.label] ?? 'bg-muted',
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt.text}</span>
                  {opt.is_correct && <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          )}

          {/* SAQ sub-parts */}
          {q.q_type === 'SAQ' && q.sub_parts?.length > 0 && (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {q.sub_parts.map((sp, i) => (
                <div key={i} className="p-3 flex items-start gap-2.5 text-xs">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-muted-foreground">
                    {sp.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="leading-relaxed">{sp.text}</p>
                    {sp.marks > 0 && (
                      <span className="mt-1 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {sp.marks} mark{sp.marks !== 1 ? 's' : ''}
                      </span>
                    )}
                    {sp.rubric && (
                      <p className="mt-1.5 rounded bg-success/8 border border-success/20 px-2 py-1.5 text-[11px] text-success leading-relaxed">
                        <span className="font-semibold">Model answer: </span>{sp.rubric}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full mark scheme */}
          {q.marking_scheme && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                <BookOpenCheck className="size-3" /> Mark scheme
              </p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">{q.marking_scheme}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main drawer

interface SubmissionQuestionReviewProps {
  submission: PdfSubmission | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SubmissionQuestionReview({
  submission, open, onOpenChange,
}: SubmissionQuestionReviewProps) {
  const { saveItemDecisions, reviewSubmission } = useData();

  // Local decisions map: q_id → {decision, remark}
  const [decisions, setDecisions] = useState<Record<string, { decision: 'accepted' | 'rejected'; remark: string }>>({});
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  // Seed decisions from what's already saved in DB when drawer opens
  useEffect(() => {
    if (!submission) return;
    const seeded: Record<string, { decision: 'accepted' | 'rejected'; remark: string }> = {};
    for (const d of submission.itemDecisions ?? []) {
      seeded[d.qId] = { decision: d.decision, remark: d.remark };
    }
    setDecisions(seeded);
  }, [submission]);

  const questions: ExtractedQuestion[] = (submission?.extractedJson ?? []) as ExtractedQuestion[];
  const total = questions.length;
  const reviewed = Object.keys(decisions).length;
  const acceptedCount = Object.values(decisions).filter((d) => d.decision === 'accepted').length;
  const rejectedCount = Object.values(decisions).filter((d) => d.decision === 'rejected').length;
  const allReviewed = reviewed === total && total > 0;

  // Auto-save decisions to DB 1 s after last change
  const persist = useCallback(
    async (updated: typeof decisions) => {
      if (!submission) return;
      setSaving(true);
      try {
        await saveItemDecisions(
          submission.id,
          Object.entries(updated).map(([qId, v]) => ({ qId, ...v })),
        );
      } catch {
        // silent — user can still re-save with the Save button
      } finally {
        setSaving(false);
      }
    },
    [submission, saveItemDecisions],
  );

  const decide = (qId: string, d: { decision: 'accepted' | 'rejected'; remark: string }) => {
    const updated = { ...decisions, [qId]: d };
    setDecisions(updated);
    void persist(updated);
  };

  const handleAcceptAll = () => {
    const updated = { ...decisions };
    let changed = false;
    for (const q of questions) {
      if (!updated[q.id] || updated[q.id].decision !== 'accepted') {
        updated[q.id] = { decision: 'accepted', remark: '' };
        changed = true;
      }
    }
    if (changed) {
      setDecisions(updated);
      void persist(updated);
    }
  };

  const handleFinalApprove = async () => {
    if (!submission || !allReviewed) return;
    setApproving(true);
    try {
      await reviewSubmission({
        submissionId: submission.id,
        stage: 'med_edu',
        decision: 'accepted',
        remarks: `QBM approved: ${acceptedCount} accepted, ${rejectedCount} rejected.`,
      });
      toast.success(`Done — ${acceptedCount} question${acceptedCount !== 1 ? 's' : ''} added to the bank.`);
      if (rejectedCount > 0) {
        toast.info(`${rejectedCount} question${rejectedCount !== 1 ? 's were' : ' was'} rejected — faculty has been notified.`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (!submission) return null;

  const qpName = submission.pdfPath?.split('/').pop() ?? 'Question Paper';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="border-b border-border px-6 py-4 shrink-0 space-y-1">
          <SheetTitle className="flex items-center gap-2 text-base">
            Final Review
            {saving && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Auto-saving…
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {qpName} · {total} extracted question{total !== 1 ? 's' : ''}
          </SheetDescription>

          {/* Progress bar */}
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{reviewed} of {total} reviewed</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="size-3" /> {acceptedCount} accepted
                </span>
                <span className="flex items-center gap-1 text-critical">
                  <XCircle className="size-3" /> {rejectedCount} rejected
                </span>
              </div>
            </div>
            <Progress value={total > 0 ? (reviewed / total) * 100 : 0} className="h-1.5" />
          </div>
        </SheetHeader>

        {/* ── Question list ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-muted-foreground">No questions were extracted from this submission.</p>
              <p className="text-xs text-muted-foreground mt-1">The parser may have failed — check the QP and MS files.</p>
            </div>
          ) : (
            questions.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                decision={
                  decisions[q.id]
                    ? { qId: q.id, ...decisions[q.id] }
                    : undefined
                }
                onDecide={(d) => decide(q.id, d)}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-border px-6 py-4 shrink-0 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={saving || reviewed === 0}
            onClick={() => persist(decisions)}
          >
            <Save className="size-3.5" />
            Save progress
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-success/40 text-success hover:bg-success/10"
            disabled={saving || total === 0 || acceptedCount === total}
            onClick={handleAcceptAll}
          >
            <CheckCircle2 className="size-3.5" />
            Accept all
          </Button>

          <div className="flex-1" />

          {!allReviewed && (
            <p className="text-xs text-muted-foreground">
              Review all {total} questions to unlock approval.
            </p>
          )}

          <Button
            disabled={!allReviewed || approving || acceptedCount === 0}
            onClick={handleFinalApprove}
            className="gap-2"
          >
            {approving
              ? <Loader2 className="size-4 animate-spin" />
              : <CheckCircle2 className="size-4" />
            }
            Final Approve ({acceptedCount} into bank)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
