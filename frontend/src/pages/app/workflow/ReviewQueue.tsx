import { useMemo, useState } from 'react';
import { ClipboardCheck, Eye, Gavel } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge, DifficultyBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { QuestionDetailDialog } from '@/components/common/QuestionDetailDialog';
import { ReviewDecisionModal } from './ReviewDecisionModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataContext';
import { timeAgo } from '@/lib/format';
import type { Question } from '@/types';

export function ReviewQueue({ stage }: { stage: 'departmental' | 'med_edu' }) {
  const { questions, userById } = useData();
  const [review, setReview] = useState<Question | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);

  const queue = useMemo(() => {
    const statuses = stage === 'departmental'
      ? ['submitted', 'under_departmental_review']
      : ['under_med_edu_review'];
    return questions.filter((q) => statuses.includes(q.status));
  }, [questions, stage]);

  const title = stage === 'departmental' ? 'Review queue' : 'Final review';
  const description = stage === 'departmental'
    ? 'Questions awaiting subject-matter review. Check each against its reference before deciding.'
    : 'SME-accepted questions awaiting your final quality check before they lock into the bank.';

  return (
    <div className="space-y-6">
      <PageHeader help={stage === 'med_edu' ? 'finalReview' : 'reviewQueue'} title={title} description={description}>
        <Badge variant={queue.length ? 'warning' : 'neutral'}>{queue.length} pending</Badge>
      </PageHeader>

      {queue.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Queue is clear" description="There are no questions waiting on you right now." />
      ) : (
        <div className="space-y-3">
          {queue.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono">{q.publicId}</Badge>
                    <StatusBadge status={q.status} />
                    <DifficultyBadge level={q.facultyDifficulty} />
                    <span className="text-xs text-muted-foreground">
                      by {userById(q.authorId)?.name} · {timeAgo(q.updatedAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{q.stem}</p>
                  <p className="text-xs text-muted-foreground">{q.subjectName} · {q.subtopicName}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreview(q)}>
                    <Eye className="size-4" /> View
                  </Button>
                  <Button size="sm" onClick={() => setReview(q)}>
                    <Gavel className="size-4" /> Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuestionDetailDialog question={preview} open={!!preview} onOpenChange={(v) => !v && setPreview(null)} />
      <ReviewDecisionModal question={review} stage={stage} open={!!review} onOpenChange={(v) => !v && setReview(null)} />
    </div>
  );
}
