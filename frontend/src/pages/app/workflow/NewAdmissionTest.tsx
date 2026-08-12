import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, FileText, Plus, Shuffle, Trash2, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DifficultyBadge, DifficultyScore } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Difficulty, Question, TOSEntryDraft } from '@/types';

interface AutofillResult {
  questions: (Question & { seenByBatches?: string[] })[];
  shortfalls: { entryId: string; subtopicName: string; required: number; available: number }[];
  repeatsForBatch: string[];
}

const STEPS = ['Define', 'Blueprint', 'Fill', 'Review'] as const;
type Step = 0 | 1 | 2 | 3;

/**
 * Creating an admission test end to end.
 *
 * The Paper Builder assumes a blueprint already exists and produces an
 * undated draft; neither held up once per-exam analysis arrived, because a
 * sitting with no date and no qualification cannot be compared against
 * anything. This walks the whole thing instead: what the test is, what it must
 * cover, which items fill it, and a last look before it exists.
 */
export function NewAdmissionTest() {
  const navigate = useNavigate();
  const { tos, programs, taxonomy, bankQuestions, createTos, createPaper } = useData();

  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);

  // --- step 1: what this test is ----------------------------------------
  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [batch, setBatch] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  // --- step 2: the blueprint --------------------------------------------
  const [tosId, setTosId] = useState('');
  const [draftEntries, setDraftEntries] = useState<TOSEntryDraft[]>([]);
  const [creatingBlueprint, setCreatingBlueprint] = useState(false);

  // --- step 3: the items -------------------------------------------------
  const [selected, setSelected] = useState<Question[]>([]);
  const [repeats, setRepeats] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const activeTos = tos.find((t) => t.id === tosId);
  const programme = programs.find((p) => p.id === programId);

  // Blueprints for the chosen qualification, since a nursing blueprint has no
  // business filling a medical technology paper.
  const relevantTos = useMemo(
    () => tos.filter((t) => !programId || !t.programId || t.programId === programId),
    [tos, programId],
  );

  useEffect(() => {
    if (tosId && !relevantTos.some((t) => t.id === tosId)) setTosId('');
  }, [relevantTos, tosId]);

  const quotaTotal = activeTos?.entries.reduce((s, e) => s + e.nRequired, 0) ?? 0;

  const canLeaveDefine = title.trim().length > 0 && programId !== '' && examDate !== '';
  const canLeaveBlueprint = !!activeTos;
  const canCreate = selected.length > 0 && canLeaveDefine;

  const saveBlueprint = async () => {
    const usable = draftEntries.filter((e) => e.topicId || e.subtopicId);
    if (usable.length === 0) {
      toast.error('Add at least one line naming a topic or subtopic.');
      return;
    }
    setBusy(true);
    try {
      const created = await createTos({
        title: `${title || 'Untitled test'} — blueprint`,
        programId: programId || null,
        examType: 'admission',
        academicYear,
        entries: usable,
      });
      setTosId(created.id);
      setCreatingBlueprint(false);
      setDraftEntries([]);
      toast.success(`Blueprint saved with ${created.entries.length} lines.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the blueprint.');
    } finally {
      setBusy(false);
    }
  };

  const autoFill = async () => {
    if (!activeTos) return;
    setBusy(true);
    try {
      const result = await api.post<AutofillResult>(
        `/tos/${activeTos.id}/autofill${api.qs({ batch })}`,
      );
      setSelected(result.questions);
      setRepeats(result.repeatsForBatch ?? []);
      if (result.shortfalls.length) {
        const short = result.shortfalls
          .map((s) => `${s.subtopicName} (${s.available}/${s.required})`)
          .join(', ');
        toast.warning(`Selected ${result.questions.length}. The bank cannot fill: ${short}.`);
      } else {
        toast.success(`Auto-selected ${result.questions.length} questions per the blueprint.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not auto-fill the paper.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const paper = await createPaper(title, tosId || null, selected.map((q) => q.id), {
        batch: batch || null,
        academicYear: academicYear || null,
        programId: programId || null,
        examType: 'admission',
        examDate,
        allowRepeats: repeats.length > 0,
      });
      toast.success('Admission test created.');
      navigate(`/app/examiner/papers/${paper.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the test.');
    } finally {
      setBusy(false);
    }
  };

  const available = useMemo(
    () => bankQuestions.filter(
      (q) => !selected.some((s) => s.id === q.id)
        && q.stem.toLowerCase().includes(search.toLowerCase()),
    ),
    [bankQuestions, selected, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader help="newAdmissionTest"
        title="New admission test"
        description="Define the sitting, pick its blueprint, fill it from the bank, and create it."
      >
        <Button variant="outline" onClick={() => navigate('/app/examiner')}>
          <ArrowLeft className="size-4" /> Cancel
        </Button>
      </PageHeader>

      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index < step && setStep(index as Step)}
              disabled={index > step}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                index === step
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : index < step
                    ? 'border-border text-foreground hover:bg-muted'
                    : 'border-dashed border-border text-muted-foreground',
              )}
            >
              <span className="grid size-5 place-items-center rounded-full bg-black/10 text-xs font-semibold">
                {index < step ? <Check className="size-3" /> : index + 1}
              </span>
              {label}
            </button>
            {index < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What is this test?</CardTitle>
            <p className="text-xs text-muted-foreground">
              The qualification and the date are both required. Admission tests for nursing, medical
              technology and the diplomas are different tests, and every per-year figure is derived
              from the exam date — a sitting without one drops out of its own trend.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="t-title">
              <Input id="t-title" value={title} placeholder="BS-MT Admission Test 2028 — Paper A"
                onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Qualification" htmlFor="t-prog">
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger id="t-prog" className="w-full"><SelectValue placeholder="Choose a programme" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Exam date" htmlFor="t-date">
              <Input id="t-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </Field>
            <Field label="Batch / intake" htmlFor="t-batch" hint="Used to warn you if this cohort has already sat an item.">
              <Input id="t-batch" value={batch} placeholder="2028" onChange={(e) => setBatch(e.target.value)} />
            </Field>
            <Field label="Academic year" htmlFor="t-year">
              <Input id="t-year" value={academicYear} placeholder="2027-2028" onChange={(e) => setAcademicYear(e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Blueprint</CardTitle>
              <p className="text-xs text-muted-foreground">
                The Table of Specification: how many questions from where.
              </p>
            </div>
            {!creatingBlueprint && (
              <Button variant="outline" size="sm" onClick={() => { setCreatingBlueprint(true); setDraftEntries([{ nRequired: 5 }]); }}>
                <Plus className="size-4" /> New blueprint
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!creatingBlueprint ? (
              <>
                <Field label="Use an existing blueprint" htmlFor="t-tos">
                  <Select value={tosId} onValueChange={setTosId}>
                    <SelectTrigger id="t-tos" className="w-full">
                      <SelectValue placeholder={relevantTos.length ? 'Choose a blueprint' : 'None for this programme yet'} />
                    </SelectTrigger>
                    <SelectContent>
                      {relevantTos.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {activeTos && (
                  <div className="flex flex-wrap gap-2">
                    {activeTos.entries.map((e) => (
                      <Badge key={e.id} variant="neutral">
                        {e.subtopicName ?? e.topicName ?? 'Any'}: {e.nRequired}
                      </Badge>
                    ))}
                    <Badge variant="good">{quotaTotal} questions required</Badge>
                  </div>
                )}
              </>
            ) : (
              <BlueprintEditor
                entries={draftEntries}
                onChange={setDraftEntries}
                taxonomy={taxonomy}
                subjectIds={programme?.subjectIds}
                onCancel={() => { setCreatingBlueprint(false); setDraftEntries([]); }}
                onSave={() => void saveBlueprint()}
                busy={busy}
              />
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Selected ({selected.length}/{quotaTotal || '—'})</CardTitle>
                <Button size="sm" disabled={busy} onClick={() => void autoFill()}>
                  <Wand2 className="size-4" /> Auto-fill from blueprint
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.length === 0 ? (
                  <EmptyState icon={Shuffle} title="Nothing selected yet"
                    description="Auto-fill from the blueprint, or add items by hand below." className="py-8" />
                ) : selected.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm">{q.stem}</p>
                      <DifficultyScore score={q.difficultyScore} weights={q.weights} attempts={q.attemptCount} />
                    </div>
                    {repeats.includes(q.id) && <Badge variant="serious">Repeat</Badge>}
                    <DifficultyBadge level={q.difficultyTag} />
                    <Button variant="ghost" size="icon" aria-label="Remove"
                      onClick={() => setSelected((s) => s.filter((x) => x.id !== q.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Add from the bank</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="Search the bank…" value={search} onChange={(e) => setSearch(e.target.value)} />
                {available.slice(0, 8).map((q) => (
                  <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <p className="line-clamp-1 flex-1 text-sm">{q.stem}</p>
                    <DifficultyBadge level={q.difficultyTag} />
                    <Button variant="outline" size="sm" onClick={() => setSelected((s) => [...s, q])}>
                      <Plus className="size-4" /> Add
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader><CardTitle>Coverage</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {activeTos?.entries.map((e) => {
                const filled = selected.filter(
                  (q) => (e.subtopicId ? q.subtopicId === e.subtopicId : q.topicId === e.topicId),
                ).length;
                return (
                  <div key={e.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{e.subtopicName ?? e.topicName ?? 'Any'}</span>
                    <span className={cn('tabular-nums font-medium', filled >= e.nRequired ? 'text-success' : 'text-warning')}>
                      {filled}/{e.nRequired}
                    </span>
                  </div>
                );
              })}
              <Separator />
              {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{level}</span>
                  <span className="font-medium tabular-nums">{selected.filter((q) => q.difficultyTag === level).length}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader>
            <CardTitle>Ready to create</CardTitle>
            <p className="text-xs text-muted-foreground">
              Nothing has been written yet. Creating the test makes it a draft you can then finalise,
              export for printing, and upload responses against.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Title" value={title} />
            <Summary label="Qualification" value={programme?.name ?? '—'} />
            <Summary label="Exam date" value={examDate || '—'} />
            <Summary label="Batch" value={batch || '—'} />
            <Summary label="Blueprint" value={activeTos?.title ?? 'None'} />
            <Summary label="Questions" value={`${selected.length}${quotaTotal ? ` / ${quotaTotal}` : ''}`} />
            <Summary label="Repeats for this batch" value={repeats.length ? String(repeats.length) : 'None'}
              tone={repeats.length ? 'warn' : undefined} />
            <Summary label="Mean discrimination"
              value={num(
                selected.reduce((s, q) => s + (q.irt?.a ?? 0), 0)
                / Math.max(selected.filter((q) => q.irt).length, 1),
              )} />
          </CardContent>
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">a</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.map((q, i) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
                    <TableCell className="max-w-sm"><p className="line-clamp-1 text-sm">{q.stem}</p></TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-0.5">
                        <DifficultyBadge level={q.difficultyTag} />
                        <DifficultyScore score={q.difficultyScore} weights={q.weights} attempts={q.attemptCount} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{q.irt ? num(q.irt.a) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => (s - 1) as Step)}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < 3 ? (
          <Button
            disabled={(step === 0 && !canLeaveDefine) || (step === 1 && !canLeaveBlueprint)}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            Next <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button disabled={!canCreate || busy} onClick={() => void create()}>
            <FileText className="size-4" /> Create admission test
          </Button>
        )}
      </div>
    </div>
  );
}

function BlueprintEditor({
  entries, onChange, taxonomy, subjectIds, onCancel, onSave, busy,
}: {
  entries: TOSEntryDraft[];
  onChange: (entries: TOSEntryDraft[]) => void;
  taxonomy: ReturnType<typeof useData>['taxonomy'];
  subjectIds?: string[];
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  // Only offer topics the chosen qualification actually covers.
  const topics = useMemo(
    () => taxonomy.topics.filter((t) => !subjectIds?.length || subjectIds.includes(t.subjectId)),
    [taxonomy.topics, subjectIds],
  );
  const subjectName = (id: string) => taxonomy.subjects.find((s) => s.id === id)?.name ?? '';

  const update = (index: number, patch: Partial<TOSEntryDraft>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  const total = entries.reduce((s, e) => s + (e.nRequired || 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        One line per topic. Pick a subtopic only where the bank is tagged that deeply — the
        admission test is normally categorised at topic level.
      </p>

      {entries.map((entry, index) => {
        const subtopics = taxonomy.subtopics.filter((s) => s.topicId === entry.topicId);
        return (
          <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_120px_100px_auto]">
            <Select value={entry.topicId ?? ''} onValueChange={(v) => update(index, { topicId: v, subtopicId: null })}>
              <SelectTrigger size="sm"><SelectValue placeholder="Topic" /></SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{subjectName(t.subjectId)} · {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={entry.subtopicId ?? 'any'}
              onValueChange={(v) => update(index, { subtopicId: v === 'any' ? null : v })}
              disabled={!entry.topicId}
            >
              <SelectTrigger size="sm"><SelectValue placeholder="Any subtopic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any subtopic</SelectItem>
                {subtopics.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entry.difficulty ?? 'Medium'} onValueChange={(v) => update(index, { difficulty: v as Difficulty })}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number" min={1} value={entry.nRequired}
              onChange={(e) => update(index, { nRequired: Number(e.target.value) || 1 })}
              aria-label="Number of questions"
            />
            <Button variant="ghost" size="icon" aria-label="Remove line"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange([...entries, { nRequired: 5 }])}>
          <Plus className="size-4" /> Add line
        </Button>
        <span className="text-sm text-muted-foreground">{total} questions in total</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={busy} onClick={onSave}>Save blueprint</Button>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: {
  label: string; htmlFor: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 truncate font-medium', tone === 'warn' && 'text-warning')}>{value}</p>
    </div>
  );
}
