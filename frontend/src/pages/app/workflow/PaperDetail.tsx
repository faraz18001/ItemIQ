import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, FileText, Lock, Table2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { HelpHint } from '@/components/common/HelpHint';
import type { HelpId } from '@/data/help';
import { PageLoader } from '@/components/common/PageLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatTile } from '@/components/common/StatTile';
import { DifficultyBadge } from '@/components/common/Badges';
import { QuestionDetailDialog } from '@/components/common/QuestionDetailDialog';
import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { formatDate, num, pct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  ImportPreview, PaperItemStat, PaperMeta, PaperStats, PaperStatus, QualityFlag, Question,
} from '@/types';

interface PaperAnalytics {
  paper: PaperMeta;
  stats: PaperStats | null;
  totalQuestions: number;
  totalAttempts: number;
  withData: number;
  calibrated: number;
  difficultyDistribution: { label: string; value: number }[];
  items: { position: number; question: Question; sitting: PaperItemStat | null }[];
  needsAttention: { question: Question; sitting: PaperItemStat; flags: QualityFlag[] }[];
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'var(--difficulty-easy)',
  Medium: 'var(--difficulty-medium)',
  Hard: 'var(--difficulty-hard)',
  'Not calibrated': 'var(--chart-axis)',
};

/**
 * KR-20 read the way an assessment office reads it. The bands are the
 * conventional ones for a classroom or admission test: below 0.5 the total
 * score is close to noise, 0.7 is the usual floor for a decision-making exam.
 */
function reliabilityBand(value: number | null | undefined) {
  if (value == null) return null;
  if (value >= 0.8) return { label: 'Excellent', tone: 'good' as const };
  if (value >= 0.7) return { label: 'Acceptable', tone: 'good' as const };
  if (value >= 0.5) return { label: 'Marginal', tone: 'warn' as const };
  return { label: 'Unreliable', tone: 'bad' as const };
}

export function PaperDetail() {
  const { paperId } = useParams();
  const { papers, setPaperStatus, refresh } = useData();
  const [data, setData] = useState<PaperAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const record = papers.find((p) => p.id === paperId);
  const status = (record?.status ?? 'draft') as PaperStatus;

  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    setData(null);
    setError(null);
    api
      .get<PaperAnalytics>(`/analytics/papers/${paperId}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this paper.'); });
    return () => { cancelled = true; };
  }, [paperId, reloadKey]);

  const download = async (variant: 'paper' | 'key' | 'template') => {
    if (!paperId) return;
    setBusy(true);
    try {
      await api.download(`/papers/${paperId}/export?variant=${variant}`, `${variant}.docx`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not produce the document.');
    } finally {
      setBusy(false);
    }
  };

  const advance = async (next: PaperStatus) => {
    if (!paperId) return;
    setBusy(true);
    try {
      await setPaperStatus(paperId, next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the status.');
    } finally {
      setBusy(false);
    }
  };

  /** Always parse first and show the examiner what landed before writing it. */
  const inspect = async (file: File) => {
    if (!paperId) return;
    setBusy(true);
    setPendingFile(file);
    try {
      setPreview(await api.upload<ImportPreview>(`/papers/${paperId}/responses?dryRun=true`, file));
    } catch (err) {
      setPreview(null);
      setPendingFile(null);
      toast.error(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!paperId || !pendingFile) return;
    setBusy(true);
    try {
      const result = await api.upload<ImportPreview>(
        `/papers/${paperId}/responses?dryRun=false`, pendingFile,
      );
      toast.success(
        `Imported ${result.responsesWritten} responses from ${result.candidates} candidates.`,
      );
      setPreview(null);
      setPendingFile(null);
      setReloadKey((k) => k + 1);
      // A successful import moves the paper to "sat" and recalibrates the whole
      // bank, so the shared caches — the paper's own status, and every item's
      // lifetime figures — are both stale now.
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not import the responses.');
    } finally {
      setBusy(false);
    }
  };

  const distribution: BarDatum[] = data
    ? data.difficultyDistribution.map((d) => ({ label: d.label, value: d.value, color: DIFFICULTY_COLOR[d.label] }))
    : [];

  const paper = data?.paper;
  const stats = data?.stats ?? null;
  const band = reliabilityBand(stats?.reliability);

  const subtitle = paper
    ? [
        paper.programName,
        paper.examDate ? formatDate(paper.examDate) : null,
        paper.batch ? `Batch ${paper.batch}` : null,
      ].filter(Boolean).join(' · ')
    : '';

  return (
    <div className="space-y-6">
      <PageHeader help="paperDetail"
        title={paper?.title ?? 'Sitting analysis'}
        description={
          subtitle
            ? `${subtitle} — every figure below is measured inside this sitting, not pooled across exams.`
            : 'Every figure below is measured inside this sitting, not pooled across exams.'
        }
      >
        <Button asChild variant="outline"><Link to="/app/examiner"><ArrowLeft className="size-4" /> Back</Link></Button>
      </PageHeader>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">Lifecycle<HelpHint id="lifecycle" /></CardTitle>
            <Badge variant={status === 'sat' ? 'good' : status === 'finalised' ? 'neutral' : 'warning'} className="capitalize">
              {status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {status === 'draft'
                ? 'Finalise to lock the item list before printing.'
                : status === 'finalised'
                  ? 'Locked. Export it, then upload the marked sheet when it comes back.'
                  : 'Responses recorded. The figures below come from them.'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'draft' && (
              <Button size="sm" disabled={busy} onClick={() => void advance('finalised')}>
                <Lock className="size-4" /> Finalise
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void download('paper')}>
              <FileDown className="size-4" /> Question paper
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void download('key')}>
              <FileDown className="size-4" /> Answer key
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void download('template')}>
              <Table2 className="size-4" /> Response sheet
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" /> Upload responses
            </Button>
            <input
              ref={fileInput} type="file" accept=".xlsx,.xlsm,.csv" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void inspect(file);
              }}
            />
          </div>
        </CardHeader>
        {preview && (
          <CardContent>
            <ImportSummary
              preview={preview}
              busy={busy}
              onCancel={() => { setPreview(null); setPendingFile(null); }}
              onConfirm={() => void commit()}
            />
          </CardContent>
        )}
      </Card>

      {error ? (
        <EmptyState icon={FileText} title="Could not load this paper" description={error} />
      ) : !data ? (
        <PageLoader />
      ) : !stats?.nCandidates ? (
        <EmptyState
          icon={FileText}
          title="This paper has not been sat yet"
          description="Download the response sheet above, and upload it once the exam has been marked. The analysis appears here the moment it lands."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Candidates" value={stats.nCandidates.toLocaleString()} accent="var(--series-1)" />
            <StatTile label="Mean score" value={pct(stats.meanScore, 1)} accent="var(--series-2)" />
            <StatTile
              label="Reliability (KR-20)"
              help="reliability"
              value={num(stats.reliability)}
              accent={band?.tone === 'bad' ? 'var(--critical)' : band?.tone === 'warn' ? 'var(--warning)' : 'var(--series-5)'}
            />
            <StatTile label="Items flagged" value={`${stats.flagged}/${stats.nItems}`} accent="var(--series-8)" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>How this sitting behaved</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Figure label="Score spread (SD)" value={pct(stats.sdScore, 1)} help="reliability" />
                <Figure label="Mean p-value" value={pct(stats.meanPValue, 1)} help="pValue" />
                <Figure label="Mean discrimination" value={num(stats.meanDiscrimination)} help="discrimination" />
                <Figure label="Items calibrated" value={`${stats.calibrated}/${stats.nItems}`} />
                <Figure label="Responses" value={data.totalAttempts.toLocaleString()} />
                <Figure label="Reliability" value={band?.label ?? 'N/A'} tone={band?.tone} />
                <Figure
                  label="Items misfitting the model"
                  help="modelFit"
                  value={`${stats.misfitting ?? 0}/${stats.nItems}`}
                  tone={(stats.misfitting ?? 0) > 0 ? 'warn' : undefined}
                />
                <Figure label="Log-likelihood" value={num(stats.logLikelihood, 0)} help="modelFit" />
                <Figure label="AIC / BIC" value={`${num(stats.aic, 0)} / ${num(stats.bic, 0)}`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Difficulty in this sitting</CardTitle>
              </CardHeader>
              <CardContent><BarChart data={distribution} /></CardContent>
            </Card>
          </div>

          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-1.5">Needs attention in this sitting<HelpHint id="needsAttention" /></CardTitle>
              <Badge variant={data.needsAttention.length ? 'serious' : 'neutral'}>{data.needsAttention.length}</Badge>
            </CardHeader>
            {data.needsAttention.length === 0 ? (
              <EmptyState icon={FileText} title="Nothing flagged on this paper" className="m-4 py-8" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>ID</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Here</TableHead>
                    <TableHead>Discrim. (a)</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.needsAttention.map(({ question: q, sitting, flags }) => (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => setSelected(q)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
                      <TableCell className="max-w-xs"><p className="line-clamp-1 text-sm">{q.stem}</p></TableCell>
                      <TableCell>{sitting.difficultyTag ? <DifficultyBadge level={sitting.difficultyTag} /> : 'N/A'}</TableCell>
                      <TableCell className="tabular-nums">{sitting.irt ? num(sitting.irt.a) : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={flags[0].tone === 'critical' ? 'critical' : flags[0].tone === 'serious' ? 'serious' : 'warning'}>
                          {flags[0].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-1.5">Every item, as it performed here<HelpHint id="modelFit" /></CardTitle>
              <span className="text-xs text-muted-foreground">
                “Here” is this sitting’s own fit; “lifetime” is the item’s blended tag across all sittings.
              </span>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Here</TableHead>
                    <TableHead>Lifetime</TableHead>
                    <TableHead className="text-right">p</TableHead>
                    <TableHead className="text-right">a</TableHead>
                    <TableHead className="text-right">b</TableHead>
                    <TableHead className="text-right">r<sub>pb</sub></TableHead>
                    <TableHead className="text-right" title="Infit / outfit mean square — how closely responses follow the fitted curve">
                      Fit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map(({ position, question: q, sitting }) => {
                    const drifted = !!sitting?.difficultyTag && sitting.difficultyTag !== q.difficultyTag;
                    return (
                      <TableRow key={q.id} className="cursor-pointer" onClick={() => setSelected(q)}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{position}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
                        <TableCell className="max-w-sm"><p className="line-clamp-1 text-sm">{q.stem}</p></TableCell>
                        <TableCell>
                          {sitting?.difficultyTag ? <DifficultyBadge level={sitting.difficultyTag} /> : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1', drifted && 'text-warning')}>
                            <DifficultyBadge level={q.difficultyTag} />
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{pct(sitting?.pValue, 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{sitting?.irt ? num(sitting.irt.a) : 'N/A'}</TableCell>
                        <TableCell className="text-right tabular-nums">{sitting?.irt ? num(sitting.irt.b) : 'N/A'}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(sitting?.pointBiserial)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {sitting?.fit ? (
                            <span title={`chi-square p = ${num(sitting.fit.pValue)}`}>
                              {num(sitting.fit.infit)} / {num(sitting.fit.outfit)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      <QuestionDetailDialog question={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

/** What the parser found, shown before anything is written. */
function ImportSummary({ preview, busy, onCancel, onConfirm }: {
  preview: ImportPreview;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const blocking = preview.questionsMatched === 0 || preview.candidates === 0;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span><span className="font-semibold tabular-nums">{preview.candidates}</span> candidates</span>
        <span><span className="font-semibold tabular-nums">{preview.questionsMatched}</span> questions matched</span>
        <span><span className="font-semibold tabular-nums">{preview.answers}</span> answers</span>
        <Badge variant={preview.mode === 'option' ? 'good' : 'warning'}>
          {preview.mode === 'option' ? 'Chosen options' : 'Right/wrong only'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          matched by {preview.matchedBy.join(' and ').replace('public_id', 'bank id')}
        </span>
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="rounded-md border border-warning/40 bg-warning/8 p-2 text-xs">
          {warning}
        </p>
      ))}

      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy || blocking} onClick={onConfirm}>
          Import {preview.answers} responses
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        <span className="text-xs text-muted-foreground">Nothing has been saved yet.</span>
      </div>
    </div>
  );
}

function Figure({ label, value, tone, help }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad'; help?: HelpId }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {help && <HelpHint id={help} />}
      </p>
      <p className={cn(
        'mt-0.5 font-semibold tabular-nums',
        tone === 'bad' && 'text-critical',
        tone === 'warn' && 'text-warning',
      )}>
        {value}
      </p>
    </div>
  );
}
