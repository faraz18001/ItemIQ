import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { HelpHint } from '@/components/common/HelpHint';
import { DifficultyBadge, DifficultyScore } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { ICCChart } from '@/components/charts/ICCChart';
import { OptionDistribution } from '@/components/charts/OptionDistribution';
import { SignalWeights } from '@/components/charts/SignalWeights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { discriminationBand, bBand, qualityFlags } from '@/lib/engine';
import { formatDate, num, pct } from '@/lib/format';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Search } from 'lucide-react';
import type { ItemSitting, ItemYear, QualityFlag, Question } from '@/types';

type ItemDetail = Question & {
  flags: QualityFlag[];
  /** One row per exam this item has appeared in, oldest first. */
  examHistory?: ItemSitting[];
  /** The same rows rolled up by exam year. */
  yearlyHistory?: ItemYear[];
};

export function ItemAnalysis() {
  const { bankQuestions, papers } = useData();
  const withData = useMemo(() => bankQuestions.filter((q) => q.irt), [bankQuestions]);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();
  const [detail, setDetail] = useState<ItemDetail | null>(null);

  // Exam-level filters
  const [filterPaper, setFilterPaper] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  // Derive available years from papers
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    papers.forEach((p) => {
      if (p.examDate) years.add(new Date(p.examDate).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [papers]);

  // Filter papers by year
  const filteredPapers = useMemo(() => {
    if (filterYear === 'all') return papers;
    return papers.filter((p) => p.examDate && new Date(p.examDate).getFullYear().toString() === filterYear);
  }, [papers, filterYear]);
  /**
   * Which sitting's numbers the panel is showing. `null` is the lifetime view —
   * every response the item has ever collected, pooled. Anything else is one
   * exam measured on its own, which is the honest comparison: the same item
   * sat by two cohorts is two observations, not one average.
   */
  const [scope, setScope] = useState<string | null>(null);

  // When a paper is selected, narrow to questions on that paper
  const paperFiltered = useMemo(() => {
    if (filterPaper === 'all') return withData;
    const paper = papers.find((p) => p.id === filterPaper);
    if (!paper) return withData;
    const qids = new Set(paper.questionIds);
    return withData.filter((q) => qids.has(q.id));
  }, [withData, filterPaper, papers]);

  const list = paperFiltered.filter((q) => q.stem.toLowerCase().includes(query.toLowerCase()));
  const summary = paperFiltered.find((q) => q.id === activeId) ?? list[0];

  // The list payload carries a/b/c but not the stored ICC curve or the tag
  // history, so the selected item is fetched in full.
  useEffect(() => {
    if (!summary) return;
    let cancelled = false;
    api
      .get<ItemDetail>(`/analytics/items/${summary.id}`)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [summary]);

  // Fall back to the summary until the detail lands, so the panel never blanks.
  const active = detail?.id === summary?.id ? detail : summary;

  const sittings = (detail?.id === active?.id && detail?.examHistory) || [];
  const years = (detail?.id === active?.id && detail?.yearlyHistory) || [];
  const sitting = sittings.find((s) => s.paperId === scope) ?? null;

  // Selecting a different item drops back to the lifetime view: a paper id from
  // the previous item means nothing here.
  useEffect(() => setScope(null), [active?.id]);

  // Everything below reads from the chosen scope. The two carry the same field
  // names by design (see api/serializers.py), so only the source differs.
  const irt = sitting ? sitting.irt : active?.irt ?? null;
  const curve = sitting ? sitting.iccCurve : active?.iccCurve;
  const nResponses = sitting ? sitting.nResponses : active?.attemptCount ?? 0;

  const disc = irt ? discriminationBand(irt.a) : null;
  const flags = detail?.id === active?.id && detail?.flags
    ? detail.flags
    : active
      ? qualityFlags(active.discriminationStatus, active.attemptCount, active.contradiction, active.stats?.nonfunctionalDistractors)
      : [];

  return (
    <div className="space-y-6">
      <PageHeader help="itemAnalysis" title="Item analysis" description="Explore the Item Characteristic Curve and psychometrics for any calibrated question." />

      {/* Filters: by year, by exam paper */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setFilterPaper('all'); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPaper} onValueChange={setFilterPaper}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All exams" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All exams</SelectItem>
            {filteredPapers.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {filterPaper !== 'all' && (
          <Badge variant="outline" className="text-xs">
            {list.length} item{list.length !== 1 ? 's' : ''} in this exam
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="gap-0 overflow-hidden p-0">
          <div className="relative border-b border-border p-3">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Find an item…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {list.map((q) => (
              <button
                key={q.id}
                onClick={() => setActiveId(q.id)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b border-border p-3 text-left transition-colors hover:bg-muted/60',
                  active?.id === q.id && 'bg-accent/50',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{q.publicId}</span>
                  <DifficultyBadge level={q.difficultyTag} />
                </div>
                <p className="line-clamp-2 text-sm">{q.stem}</p>
              </button>
            ))}
          </div>
        </Card>

        {active ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">{active.publicId}</Badge>
                  <DifficultyBadge level={sitting?.difficultyTag ?? active.difficultyTag} />
                  {/* A sitting's own difficulty comes entirely from that
                      sitting's responses, so it is reported as fully
                      student-derived rather than as a blend. */}
                  <DifficultyScore
                    score={sitting ? sitting.studentSignal : active.difficultyScore}
                    weights={sitting ? { faculty: 0, ai: 0, student: 1 } : active.weights}
                    attempts={nResponses}
                  />
                </div>
                <CardTitle className="text-base font-medium leading-relaxed">{active.stem}</CardTitle>

                {sittings.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="mr-1 text-xs text-muted-foreground">Curve for:</span>
                    <ScopeButton active={scope === null} onClick={() => setScope(null)}>
                      Lifetime
                    </ScopeButton>
                    {sittings.map((s) => (
                      <ScopeButton key={s.paperId} active={scope === s.paperId} onClick={() => setScope(s.paperId)}>
                        {s.paper.year ?? s.paper.title}
                      </ScopeButton>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {irt ? (
                  <>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      Item Characteristic Curve<HelpHint id="iccCurve" />
                    </div>
                    <ICCChart irt={irt} curve={curve} empirical={sitting?.empiricalIcc} height={280} />
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    This sitting produced no stable fit — too few candidates, or every one of them
                    answered the same way.
                  </p>
                )}
                {sitting && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {sitting.paper.title}
                    {sitting.paper.examDate ? ` · ${formatDate(sitting.paper.examDate)}` : ''}
                    {sitting.paper.programName ? ` · ${sitting.paper.programName}` : ''}
                    {sitting.empiricalIcc?.length
                      ? ' · dots are what candidates actually did, grouped by ability'
                      : ''}
                  </p>
                )}
                {sitting?.fit && (
                  <p className={cn(
                    'mt-1 text-xs',
                    sitting.fit.flagged ? 'text-warning' : 'text-muted-foreground',
                  )}>
                    Fit: infit {num(sitting.fit.infit)}, outfit {num(sitting.fit.outfit)}
                    {sitting.fit.pValue !== null && ` · χ² p = ${num(sitting.fit.pValue)}`}
                    {' — '}
                    {sitting.fit.flagged
                      ? 'these responses depart from the fitted curve by more than the rest of the paper does.'
                      : 'responses behave the way the fitted curve predicts.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {irt && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Param label="Discrimination (a)" value={num(irt.a)} sub={disc?.label} tone={irt.a < 0.5 ? 'bad' : 'good'} />
                <Param label="Difficulty (b)" value={num(irt.b)} sub={bBand(irt.b) ?? undefined} />
                <Param label="Guessing (c)" value={num(irt.c)} sub="Lower asymptote" />
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-1.5">Signal weighting<HelpHint id="signalWeighting" /></CardTitle></CardHeader>
                <CardContent>{active.weights && <SignalWeights weights={active.weights} />}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-1.5">Response distribution<HelpHint id="responseDistribution" /></CardTitle></CardHeader>
                <CardContent><OptionDistribution question={active} picks={sitting?.optionPicks} /></CardContent>
              </Card>
            </div>

            {sittings.length > 0 && (
              <Card className="gap-0 overflow-hidden p-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">Performance by sitting<HelpHint id="modelFit" /></CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Each exam is fitted on its own responses. A question sitting alongside 29 others is
                    not the same measurement as the same question alongside 19, so these are kept apart
                    rather than averaged.
                  </p>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Sitting</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Programme</TableHead>
                        <TableHead className="text-right">n</TableHead>
                        <TableHead className="text-right">p</TableHead>
                        <TableHead className="text-right">a</TableHead>
                        <TableHead className="text-right">b</TableHead>
                        <TableHead>Difficulty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sittings.map((s) => (
                        <TableRow
                          key={s.paperId}
                          className={cn('cursor-pointer', scope === s.paperId && 'bg-accent/50')}
                          onClick={() => setScope(scope === s.paperId ? null : s.paperId)}
                        >
                          <TableCell className="max-w-xs"><p className="line-clamp-1 text-sm">{s.paper.title}</p></TableCell>
                          <TableCell className="tabular-nums">{s.paper.year ?? 'N/A'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.paper.programName ?? 'N/A'}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.nResponses}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct(s.pValue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.irt ? num(s.irt.a) : 'N/A'}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.irt ? num(s.irt.b) : 'N/A'}</TableCell>
                          <TableCell>{s.difficultyTag ? <DifficultyBadge level={s.difficultyTag} /> : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {years.length > 1 && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border p-3 text-xs">
                    <span className="text-muted-foreground">By year:</span>
                    {years.map((y) => (
                      <span key={y.year} className="tabular-nums">
                        <span className="font-medium">{y.year}</span>
                        <span className="text-muted-foreground">
                          {' '}· {y.sittings} sitting{y.sittings === 1 ? '' : 's'} · n={y.nResponses} · p={pct(y.pValue)}
                          {y.irt ? ` · b=${num(y.irt.b)}` : ''}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {(sitting || active.stats) && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-1.5">Classical statistics<HelpHint id="pointBiserial" /></CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {sitting ? `${sitting.paper.title} · ` : 'Lifetime · '}n = {nResponses} attempts
                  </span>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="p-value" value={pct(sitting ? sitting.pValue : active.stats!.pValue)} />
                  <Stat label="Discrim. index" value={num(sitting ? sitting.discriminationIndex : active.stats!.discriminationIndex)} />
                  <Stat label="Point-biserial" value={num(sitting ? sitting.pointBiserial : active.stats!.pointBiserial)} />
                  <Stat label="Distractor eff." value={pct(sitting ? sitting.distractorEfficiency : active.stats!.distractorEfficiency)} />
                </CardContent>
              </Card>
            )}

            {flags.map((f) => (
              <div key={f.key} className={cn(
                'rounded-lg border p-3 text-sm',
                f.tone === 'critical' ? 'border-critical/40 bg-critical/8' : f.tone === 'serious' ? 'border-serious/40 bg-serious/8' : 'border-warning/40 bg-warning/8',
              )}>
                <p className="font-medium">{f.label}</p>
                <p className="text-muted-foreground">{f.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={LineChart} title="No calibrated items" description="Questions appear here once they have accumulated student responses." />
        )}
      </div>
    </div>
  );
}

function ScopeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function Param({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-semibold tabular-nums', tone === 'bad' && 'text-critical')}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
