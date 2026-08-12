import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FilePlus2, FileText, Inbox, PencilLine } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { StatusBadge, DifficultyBadge, RequestStatusBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { timeAgo } from '@/lib/format';

export function FacultyDashboard() {
  const { session } = useAuth();
  const { questions, requests } = useData();
  const myId = session!.id;

  const mine = useMemo(() => questions.filter((q) => q.authorId === myId), [questions, myId]);
  const myRequests = requests.filter((r) => r.assignedTo === myId);
  const corrections = mine.filter((q) => q.status === 'correction_required');
  const inBank = mine.filter((q) => q.status === 'in_bank').length;
  const pending = mine.filter((q) => ['submitted', 'under_departmental_review', 'under_med_edu_review'].includes(q.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader help="facultyDashboard" title={`Welcome, ${session!.name.split(' ')[1] ?? session!.name}`} description="Your authoring workspace: assigned requests, drafts, and review status.">
        <Button asChild><Link to="/app/faculty/new"><FilePlus2 className="size-4" /> Add question</Link></Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Assigned requests" value={myRequests.length} icon={Inbox} accent="var(--series-5)" />
        <StatTile label="Authored" value={mine.length} icon={FileText} accent="var(--series-1)" />
        <StatTile label="In bank" value={inBank} icon={CheckCircle2} accent="var(--series-2)" />
        <StatTile label="Awaiting review" value={pending} icon={PencilLine} accent="var(--series-8)" />
      </div>

      {corrections.length > 0 && (
        <Card className="border-serious/40 bg-serious/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-serious"><PencilLine className="size-4" /> Corrections requested</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {corrections.map((q) => (
              <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{q.stem}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{q.reviews.at(-1)?.remarks ?? q.reviewRemark}</p>
                </div>
                <Button asChild size="sm" variant="outline"><Link to={`/app/faculty/edit/${q.id}`}>Revise</Link></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Assigned requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myRequests.length === 0 ? (
              <EmptyState icon={Inbox} title="No assignments" description="New requests from your HOD will appear here." className="py-8" />
            ) : (
              myRequests.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.subtopicName}</p>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.subjectName} · {r.topicName}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={(r.submitted / r.qCount) * 100} className="flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground">{r.submitted}/{r.qCount}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My questions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mine.length === 0 ? (
              <EmptyState icon={FileText} title="Nothing authored yet" className="py-8" />
            ) : (
              mine.slice(0, 6).map((q) => (
                <div key={q.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm">{q.stem}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(q.updatedAt)}</p>
                  </div>
                  <DifficultyBadge level={q.difficultyTag} />
                  <StatusBadge status={q.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
