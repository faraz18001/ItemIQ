import { Bookmark, Flame, Target, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { DifficultyBadge } from '@/components/common/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/context/DataContext';
import { pct } from '@/lib/format';

export function Progress() {
  // Accuracy, streak and the subject split are computed server-side from the
  // stored responses, so they survive a refresh and match what the engine sees.
  const { progress, bookmarks, bankQuestions } = useData();
  const { attempted, accuracy, streak, bySubject } = progress;

  const bookmarked = bankQuestions.filter((q) => bookmarks.includes(q.id));

  return (
    <div className="space-y-6">
      <PageHeader help="progress" title="My progress" description="Your practice performance. Accuracy counts your first attempt at each question." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Questions attempted" value={attempted} icon={Target} accent="var(--series-1)" />
        <StatTile label="Accuracy" value={pct(accuracy)} icon={TrendingUp} accent="var(--series-2)" hint="First attempts only" />
        <StatTile label="Current streak" value={streak} icon={Flame} accent="var(--series-8)" hint="Consecutive correct" />
        <StatTile label="Bookmarks" value={bookmarked.length} icon={Bookmark} accent="var(--series-5)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Accuracy by subject</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bySubject.length === 0 ? (
              <EmptyState icon={Target} title="No attempts yet" description="Practice some questions to see your breakdown." className="py-8" />
            ) : (
              bySubject.map(({ subject, correct, total }) => {
                const acc = total ? correct / total : 0;
                return (
                  <div key={subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{subject}</span>
                      <span className="tabular-nums text-muted-foreground">{correct}/{total} · {pct(acc)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-series-2 transition-[width]" style={{ width: `${acc * 100}%`, background: 'var(--series-2)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bookmarked questions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bookmarked.length === 0 ? (
              <EmptyState icon={Bookmark} title="No bookmarks" description="Bookmark questions while practising to revisit them here." className="py-8" />
            ) : (
              bookmarked.map((q) => (
                <div key={q.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                  <p className="line-clamp-1 flex-1 text-sm">{q.stem}</p>
                  <DifficultyBadge level={q.difficultyTag} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
