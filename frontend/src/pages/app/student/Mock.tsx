import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, RotateCcw, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DifficultyBadge } from '@/components/common/Badges';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { pct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AttemptResult, Difficulty, Question } from '@/types';

const matchesDifficulty = (q: Question, d: Difficulty | 'all') =>
  d === 'all' || q.difficultyTag === d;

type Phase = 'setup' | 'exam' | 'result';

interface MockPaper {
  paperId: string;
  questions: Question[];
}

interface MockResult {
  paperId: string;
  total: number;
  answered: number;
  correct: number;
  score: number;
  results: AttemptResult[];
}

const ALL = 'all';

export function Mock() {
  const { bankQuestions, taxonomy, refresh } = useData();
  const [phase, setPhase] = useState<Phase>('setup');
  const [count, setCount] = useState(5);
  const [paper, setPaper] = useState<MockPaper | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<MockResult | null>(null);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  // Scope: subject -> topic -> subtopic, each optional. Revising one subtopic
  // should give you questions from that subtopic only.
  const [subjectId, setSubjectId] = useState(ALL);
  const [topicId, setTopicId] = useState(ALL);
  const [subtopicId, setSubtopicId] = useState(ALL);
  const [difficulty, setDifficulty] = useState<Difficulty | typeof ALL>(ALL);

  const topics = useMemo(
    () => (subjectId === ALL ? [] : taxonomy.topics.filter((t) => t.subjectId === subjectId)),
    [taxonomy.topics, subjectId],
  );
  const subtopics = useMemo(
    () => (topicId === ALL ? [] : taxonomy.subtopics.filter((s) => s.topicId === topicId)),
    [taxonomy.subtopics, topicId],
  );

  // Counted client-side from the same bank the server draws from, so the
  // student knows before starting whether the selection is viable.
  const available = useMemo(
    () => bankQuestions.filter((q) => {
      if (subtopicId !== ALL) return q.subtopicId === subtopicId && matchesDifficulty(q, difficulty);
      if (topicId !== ALL) return q.topicId === topicId && matchesDifficulty(q, difficulty);
      if (subjectId !== ALL) return q.subjectId === subjectId && matchesDifficulty(q, difficulty);
      return matchesDifficulty(q, difficulty);
    }).length,
    [bankQuestions, subjectId, topicId, subtopicId, difficulty],
  );

  // Offer only lengths the selection can actually fill, deduplicated — a
  // three-question subtopic should show one "3", not "3 3 3".
  const lengthChoices = useMemo(
    () => [...new Set([5, 10, 15].map((n) => Math.min(n, Math.max(1, available))))],
    [available],
  );

  // Keep the chosen length valid when the scope narrows under it.
  useEffect(() => {
    if (!lengthChoices.includes(count)) setCount(lengthChoices[0]);
  }, [lengthChoices, count]);

  const scopeLabel =
    subtopicId !== ALL ? taxonomy.subtopics.find((s) => s.id === subtopicId)?.name
      : topicId !== ALL ? taxonomy.topics.find((t) => t.id === topicId)?.name
      : subjectId !== ALL ? taxonomy.subjects.find((s) => s.id === subjectId)?.name
      : 'the whole bank';

  // The paper is assembled and shuffled server-side; the questions come back
  // with the answer key stripped, so a mock genuinely withholds feedback.
  const start = async () => {
    setBusy(true);
    try {
      const built = await api.post<MockPaper>('/mock/start', {
        count: Math.min(count, available),
        subjectId: subjectId === ALL ? null : subjectId,
        topicId: topicId === ALL ? null : topicId,
        subtopicId: subtopicId === ALL ? null : subtopicId,
        difficulty: difficulty === ALL ? null : difficulty,
      });
      setPaper(built);
      setAnswers({});
      setIdx(0);
      setPhase('exam');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the mock exam.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!paper) return;
    setBusy(true);
    try {
      const res = await api.post<MockResult>(`/mock/${paper.paperId}/submit`, { answers });
      setOutcome(res);
      setPhase('result');
      // Submitting shifts every answered item's statistics; pull the fresh tags.
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit the exam.');
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        <PageHeader help="mock" title="Mock exam" description="Sit a timed-style paper. Feedback is withheld until you submit, just like the real thing." />
        <Card className="mx-auto max-w-md">
          <CardHeader><CardTitle>New mock paper</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">What do you want to be tested on?</p>

              <Select
                value={subjectId}
                onValueChange={(v) => { setSubjectId(v); setTopicId(ALL); setSubtopicId(ALL); }}
              >
                <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All subjects</SelectItem>
                  {taxonomy.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={topicId}
                disabled={subjectId === ALL}
                onValueChange={(v) => { setTopicId(v); setSubtopicId(ALL); }}
              >
                <SelectTrigger><SelectValue placeholder="All topics" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All topics</SelectItem>
                  {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={subtopicId} disabled={topicId === ALL} onValueChange={setSubtopicId}>
                <SelectTrigger><SelectValue placeholder="All subtopics" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All subtopics</SelectItem>
                  {subtopics.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | typeof ALL)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any difficulty</SelectItem>
                  {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Available in {scopeLabel}</span>
              <Badge variant={available === 0 ? 'critical' : 'neutral'}>{available} questions</Badge>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Number of questions</p>
              <div className="flex gap-2">
                {lengthChoices.map((n) => (
                  <Button
                    key={n}
                    variant={count === n ? 'default' : 'outline'}
                    onClick={() => setCount(n)}
                    disabled={available === 0}
                    className="flex-1"
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {available === 0
                ? 'No questions match that selection yet. Try a broader topic or difficulty.'
                : 'Questions are drawn and shuffled by the server, so each sitting differs.'}
            </p>
            <Button className="w-full" onClick={start} disabled={busy || available === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />} Start exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'result' && outcome && paper) {
    const byId = new Map(outcome.results.map((r) => [r.questionId, r]));
    return (
      <div className="space-y-6">
        <PageHeader title="Results" description="Here's how you did. Review each item below." />
        <Card className="mx-auto max-w-md items-center gap-3 p-8 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-accent text-primary"><Trophy className="size-8" /></span>
          <p className="text-4xl font-bold tabular-nums">{pct(outcome.score)}</p>
          <p className="text-muted-foreground">{outcome.correct} of {outcome.total} correct</p>
          <Button variant="outline" onClick={() => { setPhase('setup'); setOutcome(null); setPaper(null); }}>
            <RotateCcw className="size-4" /> New mock
          </Button>
        </Card>
        <div className="space-y-2">
          {paper.questions.map((q, i) => {
            const r = byId.get(q.id);
            const ok = r?.isCorrect ?? false;
            const pickedLabel = r?.selected != null ? q.options[r.selected]?.label : 'N/A';
            return (
              <Card key={q.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold', ok ? 'bg-success/15 text-success' : 'bg-critical/15 text-critical')}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{q.stem}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your answer: {pickedLabel} · Correct: {r?.correctLabel ?? 'N/A'}
                      {r?.skipped && ' · not answered'}
                    </p>
                  </div>
                  <DifficultyBadge level={q.difficultyTag} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // exam phase
  if (!paper) return null;
  const q = paper.questions[idx];
  const answeredCount = Object.keys(answers).length;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant="neutral">Question {idx + 1} of {paper.questions.length}</Badge>
        <span className="text-sm text-muted-foreground">{answeredCount} answered</span>
      </div>
      <Progress value={((idx + 1) / paper.questions.length) * 100} />

      <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-base font-medium leading-relaxed">{q.stem}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                    answers[q.id] === i ? 'border-primary bg-accent/40' : 'border-border hover:bg-muted',
                  )}
                >
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded font-semibold', answers[q.id] === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {opt.label}
                  </span>
                  {opt.text}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          <ChevronLeft className="size-4" /> Previous
        </Button>
        {idx < paper.questions.length - 1 ? (
          <Button onClick={() => setIdx((i) => i + 1)}>Next <ChevronRight className="size-4" /></Button>
        ) : (
          <Button onClick={finish} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Submit exam
          </Button>
        )}
      </div>
    </div>
  );
}
