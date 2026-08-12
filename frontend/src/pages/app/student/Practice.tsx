import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bookmark, BookOpen, CheckCircle2, Loader2, Search, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageLoader } from '@/components/common/PageLoader';
import { DifficultyBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/context/DataContext';
import { cn } from '@/lib/utils';
import type { AttemptResult, Question } from '@/types';

export function Practice() {
  const { bankQuestions, taxonomy, bookmarks, toggleBookmark, loading } = useData();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [active, setActive] = useState<Question | null>(null);

  const list = useMemo(
    () => bankQuestions.filter((q) =>
      (subject === 'all' || q.subjectId === subject) &&
      q.stem.toLowerCase().includes(query.toLowerCase()),
    ),
    [bankQuestions, subject, query],
  );

  if (loading && bankQuestions.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader help="practice" title="Practice" description="Sharpen up on real bank questions with instant feedback.">
        <Badge variant="neutral">{bankQuestions.length} questions</Badge>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search questions…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {taxonomy.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={BookOpen} title="No questions found" description="Try a different search or subject." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((q) => (
            <Card key={q.id} className="group">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{q.subjectName} · {q.subtopicName}</span>
                  <button onClick={() => toggleBookmark(q.id)} aria-label="Bookmark" className="text-muted-foreground hover:text-primary">
                    <Bookmark className={cn('size-4', bookmarks.includes(q.id) && 'fill-primary text-primary')} />
                  </button>
                </div>
                <p className="line-clamp-3 flex-1 text-sm">{q.stem}</p>
                <div className="flex items-center justify-between">
                  <DifficultyBadge level={q.difficultyTag} />
                  <Button size="sm" onClick={() => setActive(q)}>Practice</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AttemptDialog question={active} onClose={() => setActive(null)} />
    </div>
  );
}

function AttemptDialog({ question, onClose }: { question: Question | null; onClose: () => void }) {
  const { recordAttempt } = useData();
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [checking, setChecking] = useState(false);

  if (!question) return null;

  // The answer key never reaches the browser before the attempt is recorded,
  // so grading comes back from the server rather than from the option flags.
  const submit = async () => {
    if (picked == null) return;
    setChecking(true);
    try {
      setResult(await recordAttempt(question.id, picked));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record your answer.');
    } finally {
      setChecking(false);
    }
  };
  const reset = () => { setPicked(null); setResult(null); onClose(); };

  return (
    <Dialog open={!!question} onOpenChange={(v) => !v && reset()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DifficultyBadge level={question.difficultyTag} />
            <span className="text-xs text-muted-foreground">{question.subtopicName}</span>
          </div>
          <DialogTitle className="text-base font-medium leading-relaxed">{question.stem}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const isPicked = picked === i;
            const isRight = result != null && result.correctPosition === i;
            const showState = result != null && (isRight || isPicked);
            return (
              <button
                key={opt.id}
                disabled={result != null}
                onClick={() => setPicked(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  !result && isPicked && 'border-primary bg-accent/40',
                  !result && !isPicked && 'border-border hover:bg-muted',
                  showState && isRight && 'border-success bg-success/10',
                  showState && isPicked && !isRight && 'border-critical bg-critical/10',
                  result && !showState && 'border-border opacity-60',
                )}
              >
                <span className={cn(
                  'grid size-6 shrink-0 place-items-center rounded font-semibold',
                  showState && isRight ? 'bg-success/20 text-success' : showState && isPicked ? 'bg-critical/20 text-critical' : 'bg-muted text-muted-foreground',
                )}>
                  {opt.label}
                </span>
                <span className="flex-1">{opt.text}</span>
                {showState && isRight && <CheckCircle2 className="size-4 text-success" />}
                {showState && isPicked && !isRight && <XCircle className="size-4 text-critical" />}
              </button>
            );
          })}
        </div>

        {result?.explanation && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="mb-1 font-medium">Explanation</p>
            <p className="text-muted-foreground">{result.explanation}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!result ? (
            <Button onClick={submit} disabled={picked == null || checking}>
              {checking && <Loader2 className="size-4 animate-spin" />} Check answer
            </Button>
          ) : (
            <Button variant="outline" onClick={reset}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
