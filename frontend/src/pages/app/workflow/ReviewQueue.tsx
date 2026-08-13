import { useMemo, useState } from 'react';
import { ClipboardCheck, Eye, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge, DifficultyBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { QuestionDetailDialog } from '@/components/common/QuestionDetailDialog';
import { ReviewDecisionModal } from './ReviewDecisionModal';
import { SubmissionReviewModal } from './SubmissionReviewModal';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { Question, PdfSubmission } from '@/types';

export function ReviewQueue({ stage }: { stage: 'departmental' | 'med_edu' }) {
  const { questions, submissions, userById, requests } = useData();
  const [review, setReview] = useState<Question | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);
  const [submissionReview, setSubmissionReview] = useState<PdfSubmission | null>(null);

  const handleViewPdf = async (submissionId: string) => {
    try {
      const blob = await api.getBlob(`/questions/submissions/download/${submissionId}`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load PDF.');
    }
  };

  const queue = useMemo(() => {
    const statuses = stage === 'departmental'
      ? ['submitted', 'under_departmental_review']
      : ['under_med_edu_review'];
    return questions.filter((q) => statuses.includes(q.status));
  }, [questions, stage]);

  const submissionQueue = useMemo(() => {
    const statuses = stage === 'departmental'
      ? ['PENDING_SME']
      : ['PENDING_QBM'];
    return submissions.filter((s) => statuses.includes(s.status));
  }, [submissions, stage]);

  const totalPending = queue.length + submissionQueue.length;

  const title = stage === 'departmental' ? 'Review queue' : 'Final review';
  const description = stage === 'departmental'
    ? 'Questions awaiting subject-matter review. Check each against its reference before deciding.'
    : 'SME-accepted questions awaiting your final quality check before they lock into the bank.';

  return (
    <div className="space-y-6">
      <PageHeader help={stage === 'med_edu' ? 'finalReview' : 'reviewQueue'} title={title} description={description}>
        <Badge variant={totalPending ? 'warning' : 'neutral'}>{totalPending} pending</Badge>
      </PageHeader>

      {totalPending === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Queue is clear" description="There are no items waiting on you right now." className="py-16" />
      ) : (
        <div className="space-y-0 divide-y divide-border border-y border-border">
          {submissionQueue.map((s) => {
            const req = requests.find((r) => r.id === s.requestId);
            return (
              <div key={s.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center bg-muted/20">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-brand">PDF UPLOAD</span>
                    <StatusBadge status={s.status === 'PENDING_SME' ? 'under_departmental_review' : 'under_med_edu_review'} />
                    <span className="text-xs font-medium text-muted-foreground">
                      by {userById(s.facultyId)?.name} · {timeAgo(s.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-base font-medium">{s.pdfPath ? s.pdfPath.split('/').pop() : 'Unknown file'}</p>
                  {req && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {req.subjectName} · {req.subtopicName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleViewPdf(s.id)} className="border-border">
                    <Eye className="size-4 mr-2" /> View PDF
                  </Button>
                  <Button size="sm" onClick={() => setSubmissionReview(s)}>
                    <Gavel className="size-4 mr-2" /> Review
                  </Button>
                </div>
              </div>
            );
          })}
          {queue.map((q) => (
            <div key={q.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-muted-foreground">{q.publicId}</span>
                  <StatusBadge status={q.status} />
                  <DifficultyBadge level={q.facultyDifficulty} />
                  <span className="text-xs font-medium text-muted-foreground">
                    by {userById(q.authorId)?.name} · {timeAgo(q.updatedAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-base font-medium">{q.stem}</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{q.subjectName} · {q.subtopicName}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Button variant="outline" size="sm" onClick={() => setPreview(q)} className="border-border">
                  <Eye className="size-4" /> View
                </Button>
                <Button size="sm" onClick={() => setReview(q)}>
                  <Gavel className="size-4" /> Review
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuestionDetailDialog question={preview} open={!!preview} onOpenChange={(v) => !v && setPreview(null)} />
      <ReviewDecisionModal question={review} stage={stage} open={!!review} onOpenChange={(v) => !v && setReview(null)} />
      <SubmissionReviewModal submission={submissionReview} stage={stage} open={!!submissionReview} onOpenChange={(v) => !v && setSubmissionReview(null)} />
    </div>
  );
}
