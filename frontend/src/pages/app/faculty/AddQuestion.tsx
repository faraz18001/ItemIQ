import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, Brain, CheckCircle2, Copy, FileUp, Loader2, Save, ScanSearch, Send, Sparkles, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { HelpHint } from '@/components/common/HelpHint';
import { PageLoader } from '@/components/common/PageLoader';
import { DifficultyBadge } from '@/components/common/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AiItemReview } from '@/components/common/AiItemReview';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { pct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Difficulty, Question } from '@/types';

const schema = z.object({
  subtopicId: z.string().min(1, 'Select a subtopic'),
  descriptionId: z.string().min(1, 'Select a learning outcome'),
  stem: z.string().min(20, 'The question stem should be at least 20 characters'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).length(4),
  correct: z.number().min(0).max(3),
  facultyDifficulty: z.enum(['Easy', 'Medium', 'Hard']),
  reference: z.string().min(3, 'Provide a source reference'),
  explanation: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AiResult {
  difficulty: Difficulty;
  score: number;
  rationale: string;
  cognitiveLevel: string;
}

interface DuplicateHit {
  similarity: number;
  question: Question;
}

/** How long the author must pause before the server-side analysis fires. */
const ANALYSIS_DEBOUNCE_MS = 600;

const BLANK: FormValues = {
  subtopicId: '', descriptionId: '', stem: '',
  options: ['', '', '', ''], correct: 0, facultyDifficulty: 'Medium', reference: '', explanation: '',
};

export function AddQuestion() {
  const { taxonomy, programs, questions, addQuestion, updateQuestion } = useData();
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const editing = editId ? questions.find((q) => q.id === editId) : undefined;

  const {
    register, handleSubmit, watch, setValue, reset, formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: BLANK });

  // The bank arrives asynchronously, so the form for an edit is populated once
  // the question it targets has loaded rather than at mount.
  const [hydrated, setHydrated] = useState(!editId);
  useEffect(() => {
    if (!editId || hydrated || !editing) return;
    reset({
      subtopicId: editing.subtopicId ?? '',
      descriptionId: editing.descriptionId ?? '',
      stem: editing.stem,
      options: editing.options.map((o) => o.text),
      correct: Math.max(0, editing.options.findIndex((o) => o.isCorrect)),
      facultyDifficulty: editing.facultyDifficulty,
      reference: editing.reference ?? '',
      explanation: editing.explanation ?? '',
    });
    setHydrated(true);
  }, [editId, editing, hydrated, reset]);

  const values = watch();

  // Cascading dropdown state
  const [programId, setProgramId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');

  // Filtered lists for cascade
  const filteredSubjects = programId
    ? taxonomy.subjects.filter((s) => {
        const prog = programs.find((p) => p.id === programId);
        return prog?.subjectIds.includes(s.id);
      })
    : taxonomy.subjects;
  const filteredTopics = subjectId
    ? taxonomy.topics.filter((t) => t.subjectId === subjectId)
    : [];
  const filteredSubtopics = topicId
    ? taxonomy.subtopics.filter((s) => s.topicId === topicId)
    : [];

  const subtopicId = values.subtopicId;
  const descriptions = taxonomy.descriptions.filter((d) => d.subtopicId === subtopicId);

  // When editing, reverse-resolve the cascade from the saved subtopicId
  useEffect(() => {
    if (!editing || !subtopicId) return;
    const st = taxonomy.subtopics.find((s) => s.id === subtopicId);
    if (!st) return;
    const topic = taxonomy.topics.find((t) => t.id === st.topicId);
    if (!topic) return;
    const subject = taxonomy.subjects.find((s) => s.id === topic.subjectId);
    if (!subject) return;
    const prog = programs.find((p) => p.subjectIds.includes(subject.id));
    if (prog && !programId) setProgramId(prog.id);
    if (!subjectId) setSubjectId(topic.subjectId);
    if (!topicId) setTopicId(st.topicId);
  }, [editing, subtopicId, taxonomy, programs, programId, subjectId, topicId]);

  // File attachment for questions with diagrams (PDF/Word upload)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const allowed = files.filter((f) =>
      /\.(pdf|docx?|png|jpe?g)$/i.test(f.name)
    );
    setAttachedFiles((prev) => [...prev, ...allowed]);
    e.target.value = ''; // reset so same file can be re-selected
  };
  const removeFile = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const [ai, setAi] = useState<AiResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const stem = values.stem ?? '';
  const optionsKey = JSON.stringify(values.options ?? []);

  // An item needs a stem and something to choose between before a critique of
  // it means anything.
  const readyForReview =
    stem.trim().length >= 20 && (values.options ?? []).filter((o) => o?.trim()).length >= 2;

  // The AI signal and the duplicate scan both run on the server now, so they
  // are debounced rather than recomputed on every keystroke.
  useEffect(() => {
    if (stem.trim().length < 20) {
      setAi(null);
      setDuplicates([]);
      return;
    }
    let cancelled = false;
    setAnalysing(true);
    const timer = setTimeout(() => {
      const options = (JSON.parse(optionsKey) as string[]).filter(Boolean);
      Promise.all([
        api.post<AiResult>('/ai/analyze', { stem, options }),
        api.get<DuplicateHit[]>(`/questions/similar${api.qs({ stem })}`),
      ])
        .then(([analysis, hits]) => {
          if (cancelled) return;
          setAi(analysis);
          setDuplicates(hits.filter((h) => h.question.id !== editId).slice(0, 3));
        })
        .catch(() => {
          if (!cancelled) setAi(null);
        })
        .finally(() => {
          if (!cancelled) setAnalysing(false);
        });
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stem, optionsKey, editId]);

  const onSubmit = (submit: boolean) => handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        subtopicId: data.subtopicId,
        descriptionId: data.descriptionId,
        stem: data.stem,
        options: data.options,
        correct: data.correct,
        facultyDifficulty: data.facultyDifficulty,
        explanation: data.explanation ?? '',
        reference: data.reference,
        submit,
      };
      // The server derives the AI signal and the blended tag itself — the
      // client never sends a difficulty score it computed.
      let result: Question;
      if (editing) result = await updateQuestion(editing.id, payload);
      else result = await addQuestion(payload);

      // Upload attached files if any
      if (attachedFiles.length > 0) {
        const fd = new FormData();
        attachedFiles.forEach((f) => fd.append('files', f));
        await api.upload(`/questions/${result.id}/attachments`, fd).catch(() => {
          toast.error('Question saved but file upload failed. You can re-attach files later.');
        });
      }

      toast.success(submit ? 'Question submitted for SME review.' : 'Draft saved.');
      navigate('/app/faculty');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the question.');
    } finally {
      setSubmitting(false);
    }
  })();

  if (editId && !editing) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader help="addQuestion" title={editing ? 'Revise question' : 'Add a question'} description="Author an MCQ. The AI analysis and duplicate check run as you type." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <Card>
            <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.length > 0 && (
                <Field label="Program">
                  <Select value={programId} onValueChange={(v) => { setProgramId(v); setSubjectId(''); setTopicId(''); setValue('subtopicId', ''); setValue('descriptionId', ''); }}>
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Subject">
                <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId(''); setValue('subtopicId', ''); setValue('descriptionId', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Topic">
                <Select value={topicId} onValueChange={(v) => { setTopicId(v); setValue('subtopicId', ''); setValue('descriptionId', ''); }} disabled={!subjectId}>
                  <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    {filteredTopics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Subtopic" error={errors.subtopicId?.message}>
                <Select value={values.subtopicId} onValueChange={(v) => { setValue('subtopicId', v); setValue('descriptionId', ''); }} disabled={!topicId}>
                  <SelectTrigger><SelectValue placeholder="Select subtopic" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubtopics.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Learning outcome" error={errors.descriptionId?.message}>
                <Select value={values.descriptionId} onValueChange={(v) => setValue('descriptionId', v)} disabled={!subtopicId}>
                  <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                  <SelectContent>
                    {descriptions.map((d) => <SelectItem key={d.id} value={d.id}>{d.text}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Question</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Stem" error={errors.stem?.message}>
                <Textarea rows={4} placeholder="Write the full question text…" {...register('stem')} />
              </Field>

              <div className="space-y-2">
                <Label>Options: select the correct answer</Label>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setValue('correct', i)}
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-md border text-sm font-semibold transition-colors',
                        values.correct === i ? 'border-success bg-success/10 text-success' : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                      aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input placeholder={`Option ${String.fromCharCode(65 + i)}`} {...register(`options.${i}` as const)} />
                  </div>
                ))}
                {errors.options && <p className="text-sm text-critical">All four options are required.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload PDF, Word, or image files for questions with diagrams, tables, or figures.
                These will be forwarded to reviewers alongside the question text.
              </p>
              <label
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
              >
                <FileUp className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload or drag files here</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX, DOC, PNG, JPG</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  multiple
                  onChange={handleFileChange}
                />
              </label>
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {attachedFiles.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                      <span className="truncate text-sm">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="ml-2 text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your difficulty estimate" error={errors.facultyDifficulty?.message}>
                  <Select value={values.facultyDifficulty} onValueChange={(v) => setValue('facultyDifficulty', v as Difficulty)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Reference" error={errors.reference?.message}>
                  <Input placeholder="Book, edition, page, or URL" {...register('reference')} />
                </Field>
              </div>
              <Field label="Explanation (optional)">
                <Textarea rows={2} placeholder="Why is the correct answer correct?" {...register('explanation')} />
              </Field>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onSubmit(false)}>
              <Save className="size-4" /> {editing ? 'Save changes' : 'Save draft'}
            </Button>
            <Button type="button" disabled={submitting} onClick={() => onSubmit(true)}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {editing ? 'Resubmit for review' : 'Submit for review'}
            </Button>
          </div>
        </form>

        {/* Live assistant panel */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="flex items-center gap-1.5">AI difficulty analysis<HelpHint id="aiAnalysis" /></CardTitle>
              {analysing && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              {ai ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <DifficultyBadge level={ai.difficulty} />
                    <Badge variant="neutral">{pct(ai.score)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ai.rationale}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Brain className="size-3.5" /> Cognitive level: <span className="font-medium text-foreground">{ai.cognitiveLevel}</span>
                  </div>
                  {values.facultyDifficulty && ai.difficulty !== values.facultyDifficulty && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/8 p-2.5 text-xs">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      <span>Your estimate ({values.facultyDifficulty}) differs from the AI's ({ai.difficulty}). Both feed the weighted tag.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {analysing ? 'Analysing…' : 'Start typing the stem to see a live analysis.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <ScanSearch className="size-4 text-primary" />
              <CardTitle className="flex items-center gap-1.5">AI item review<HelpHint id="aiReview" /></CardTitle>
            </CardHeader>
            <CardContent>
              <AiItemReview
                target={{
                  stem,
                  options: (values.options ?? []).filter(Boolean),
                  // Only send the key once every option is written — before
                  // that the index points at a blank box and the reviewer
                  // model would be judging an answer that isn't there yet.
                  correct: (values.options ?? []).every(Boolean) ? values.correct : undefined,
                  explanation: values.explanation ?? '',
                }}
                disabled={!readyForReview}
                hint={
                  readyForReview
                    ? 'Checks the item for giveaway cues, a disputable key, and what may trip students up.'
                    : 'Write the stem and at least two options, then run a review.'
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Copy className="size-4 text-primary" />
              <CardTitle className="flex items-center gap-1.5">Duplicate check<HelpHint id="duplicateCheck" /></CardTitle>
            </CardHeader>
            <CardContent>
              {stem.trim().length < 20 ? (
                <p className="text-sm text-muted-foreground">Awaiting the question stem.</p>
              ) : duplicates.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" /> No similar items in the bank.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-serious">Possible near-duplicates found:</p>
                  {duplicates.map((d) => (
                    <div key={d.question.id} className="rounded-lg border border-serious/30 bg-serious/5 p-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-[10px]">{d.question.publicId}</Badge>
                        <Badge variant="serious">{pct(d.similarity)} match</Badge>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{d.question.stem}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
