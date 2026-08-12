import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Plus, RefreshCw, Shuffle, Trash2, Wand2, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { HelpHint } from '@/components/common/HelpHint';
import { DifficultyBadge, DifficultyScore } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { formatDate, num } from '@/lib/format';
import type { Question, TOS } from '@/types';

interface AutofillPick extends Question {
  seenByBatches?: string[];
}

interface AutofillResult {
  questions: AutofillPick[];
  shortfalls: { entryId: string; subtopicName: string; required: number; available: number }[];
  programId: string | null;
  offProgrammeSkipped: number;
  repeatsForBatch: string[];
}

export function PaperBuilder() {
  const { tos, bankQuestions, papers, createPaper } = useData();
  const [view, setView] = useState<'build' | 'papers'>('build');
  const [tosId, setTosId] = useState('');
  const [selected, setSelected] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  // The cohort sitting this paper. Drives exposure checking: an item this
  // batch has already answered should not reappear in their next exam.
  const [batch, setBatch] = useState('');
  const [repeats, setRepeats] = useState<string[]>([]);
  const activeTos = tos.find((t) => t.id === tosId);

  // The blueprint list arrives asynchronously; select the first one once it does.
  useEffect(() => {
    if (!tosId && tos.length) setTosId(tos[0].id);
  }, [tos, tosId]);

  // Selection runs on the server so it draws from the whole bank, and reports
  // any blueprint slot the bank cannot fill rather than quietly under-filling.
  const autoGenerate = async () => {
    if (!activeTos) return;
    setBusy(true);
    try {
      const result = await api.post<AutofillResult>(
        `/tos/${activeTos.id}/autofill${api.qs({ batch })}`,
      );
      setSelected(result.questions);
      setRepeats(result.repeatsForBatch ?? []);
      if (result.repeatsForBatch?.length) {
        toast.warning(
          `${result.repeatsForBatch.length} of these have already been sat by batch ${batch}. ` +
          'The bank could not fill the blueprint without repeating them.',
        );
      } else if (result.shortfalls.length) {
        const short = result.shortfalls
          .map((s) => `${s.subtopicName} (${s.available}/${s.required})`)
          .join(', ');
        toast.warning(`Selected ${result.questions.length}. The bank cannot fill: ${short}.`);
      } else {
        toast.success(`Auto-selected ${result.questions.length} questions per the TOS.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not auto-fill the paper.');
    } finally {
      setBusy(false);
    }
  };

  const quotaTotal = activeTos?.entries.reduce((s, e) => s + e.nRequired, 0) ?? 0;

  const add = (q: Question) => setSelected((s) => (s.some((x) => x.id === q.id) ? s : [...s, q]));
  const remove = (id: string) => setSelected((s) => s.filter((x) => x.id !== id));

  const save = async () => {
    if (!activeTos || selected.length === 0) return;
    setBusy(true);
    try {
      await createPaper(
        `${activeTos.title} Paper`,
        activeTos.id,
        selected.map((q) => q.id),
        { batch: batch || null, academicYear: activeTos.academicYear || null },
      );
      toast.success(batch ? `Exam paper created for batch ${batch}.` : 'Exam paper created.');
      setSelected([]);
      setRepeats([]);
    } catch (err) {
      // The server refuses repeats for a cohort unless explicitly allowed;
      // surface that rather than silently dropping the paper.
      toast.error(err instanceof Error ? err.message : 'Could not create the paper.');
    } finally {
      setBusy(false);
    }
  };

  const available = useMemo(
    () => bankQuestions.filter((q) =>
      !selected.some((s) => s.id === q.id) &&
      q.stem.toLowerCase().includes(search.toLowerCase()),
    ),
    [bankQuestions, selected, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader help="paperBuilder" title="Paper builder" description="Assemble an exam paper from the approved bank, by hand or driven by the Table of Specification.">
        <Button asChild variant="outline">
          <Link to="/app/examiner/new"><Wand2 className="size-4" /> New admission test</Link>
        </Button>
        {view === 'build' && (
          <>
            <Button variant="outline" disabled={!selected.length} onClick={() => setSelected([])}>
              <RefreshCw className="size-4" /> Reset
            </Button>
            <Button disabled={!selected.length || busy} onClick={() => void save()}>
              <FileText className="size-4" /> Create paper ({selected.length})
            </Button>
          </>
        )}
      </PageHeader>

      <Tabs value={view} onValueChange={(v) => setView(v as 'build' | 'papers')}>
        <TabsList>
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="papers">Papers ({papers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <CardTitle className="flex flex-1 items-center gap-1.5">Table of Specification<HelpHint id="tos" /></CardTitle>
                  <Select value={tosId} onValueChange={(v) => { setTosId(v); setSelected([]); }}>
                    <SelectTrigger size="sm" className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>{tos.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                  </Select>
                </CardHeader>
                {activeTos && <TosSummary tos={activeTos} selected={selected} onAuto={() => void autoGenerate()} quotaTotal={quotaTotal} />}
              </Card>

              <Tabs defaultValue="selected">
                <TabsList>
                  <TabsTrigger value="selected">Selected ({selected.length})</TabsTrigger>
                  <TabsTrigger value="browse">Browse bank</TabsTrigger>
                </TabsList>

                <TabsContent value="selected" className="mt-3">
                  {selected.length === 0 ? (
                    <EmptyState icon={Wand2} title="No questions selected"
                      description="Use automated mode to fill the TOS, or browse the bank to add questions manually." />
                  ) : (
                    <div className="space-y-2">
                      {selected.map((q, i) => (
                        <Card key={q.id}>
                          <CardContent className="flex items-center gap-3 p-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm">{q.stem}</p>
                              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <span>{q.subtopicName} · a={q.irt ? num(q.irt.a) : 'N/A'}</span>
                                <DifficultyScore
                                  score={q.difficultyScore}
                                  weights={q.weights}
                                  attempts={q.attemptCount}
                                />
                              </p>
                            </div>
                            {repeats.includes(q.id) && (
                              <Badge variant="serious" title={`Batch ${batch} has already sat this question`}>
                                Repeat
                              </Badge>
                            )}
                            <DifficultyBadge level={q.difficultyTag} />
                            <Button variant="ghost" size="icon" onClick={() => remove(q.id)} aria-label="Remove"><Trash2 className="size-4" /></Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="browse" className="mt-3 space-y-3">
                  <Input placeholder="Search the bank…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <div className="space-y-2">
                    {available.slice(0, 12).map((q) => (
                      <Card key={q.id}>
                        <CardContent className="flex items-center gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm">{q.stem}</p>
                            <p className="text-xs text-muted-foreground">{q.subtopicName}</p>
                          </div>
                          <DifficultyBadge level={q.difficultyTag} />
                          <Button variant="outline" size="sm" onClick={() => add(q)}><Plus className="size-4" /> Add</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <Card className="h-fit lg:sticky lg:top-20">
              <CardHeader><CardTitle>Paper summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paper-batch">Batch sitting this paper</Label>
                  <Input
                    id="paper-batch"
                    placeholder="e.g. 2028"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Recorded on the paper as a time reference, and used to warn you if this
                    cohort has already sat any of these questions.
                  </p>
                </div>
                <Separator />
                <SummaryRow label="Selected" value={`${selected.length} / ${quotaTotal}`} />
                <SummaryRow label="Easy" value={selected.filter((q) => q.difficultyTag === 'Easy').length} />
                <SummaryRow label="Medium" value={selected.filter((q) => q.difficultyTag === 'Medium').length} />
                <SummaryRow label="Hard" value={selected.filter((q) => q.difficultyTag === 'Hard').length} />
                <Button className="w-full" variant="outline" onClick={() => void autoGenerate()}>
                  <Shuffle className="size-4" /> Auto-fill from TOS
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="papers" className="mt-4">
          {papers.length === 0 ? (
            <EmptyState icon={FileText} title="No papers yet" description="Papers created in the Build tab will appear here for analysis." />
          ) : (
            <Card className="gap-0 overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead>Sat</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {papers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/app/examiner/papers/${p.id}`} className="text-sm font-medium hover:underline">
                          {p.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(p.examDate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.batch ?? 'N/A'}</TableCell>
                      <TableCell className="tabular-nums text-sm">{p.questionIds.length}</TableCell>
                      <TableCell><Badge variant="neutral" className="capitalize">{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TosSummary({ tos, selected, onAuto, quotaTotal }: { tos: TOS; selected: Question[]; onAuto: () => void; quotaTotal: number }) {
  return (
    <CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tos.entries.map((e) => {
          const filled = selected.filter((q) => q.subtopicId === e.subtopicId).length;
          const done = filled >= e.nRequired;
          return (
            <Badge key={e.id} variant={done ? 'good' : 'neutral'} className="gap-1">
              {done ? null : <X className="size-3" />}
              {e.subtopicName}: {filled}/{e.nRequired}
            </Badge>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{quotaTotal} questions required</span>
        <Button size="sm" onClick={onAuto}><Wand2 className="size-4" /> Automated mode</Button>
      </div>
    </CardContent>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
