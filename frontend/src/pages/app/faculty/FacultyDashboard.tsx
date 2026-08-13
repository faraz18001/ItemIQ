import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FilePlus2, FileText, Inbox, PencilLine } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { StatusBadge, DifficultyBadge, RequestStatusBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
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
        <section className="border-t-4 border-serious pt-6 pb-2">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-serious mb-4">
            <PencilLine className="size-5" /> Corrections requested
          </h2>
          <div className="space-y-0 divide-y divide-border border-b border-border">
            {corrections.map((q) => (
              <div key={q.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-base font-medium">{q.stem}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-serious font-medium">
                    {q.reviews.at(-1)?.remarks ?? q.reviewRemark}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 border-serious text-serious hover:bg-serious hover:text-serious-foreground">
                  <Link to={`/app/faculty/edit/${q.id}`}>Revise Question</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="pt-8 border-t border-border mt-8">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Assigned requests</h2>
          <div className="space-y-0 divide-y divide-border border-y border-border">
            {myRequests.length === 0 ? (
              <EmptyState icon={Inbox} title="No assignments" description="New requests from your HOD will appear here." className="py-12 border-0" />
            ) : (
              myRequests.map((r) => (
                <div key={r.id} className="py-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-base font-semibold">{r.subtopicName}</p>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{r.subjectName} · {r.topicName}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={(r.submitted / r.qCount) * 100} className="flex-1 h-2" />
                    <span className="text-xs font-bold tabular-nums text-foreground">{r.submitted} / {r.qCount} submitted</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="pt-8 border-t border-border mt-8">
          <h2 className="text-2xl font-bold tracking-tight mb-6">My questions</h2>
          <div className="space-y-0 divide-y divide-border border-y border-border">
            {mine.length === 0 ? (
              <EmptyState icon={FileText} title="Nothing authored yet" className="py-12 border-0" />
            ) : (
              mine.slice(0, 8).map((q) => (
                <div key={q.id} className="flex items-start sm:items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-base font-medium">{q.stem}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <DifficultyBadge level={q.difficultyTag} />
                      <span className="text-xs text-muted-foreground font-medium">{timeAgo(q.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={q.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
