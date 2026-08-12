import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Database, Layers, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { HelpHint } from '@/components/common/HelpHint';
import { StatTile } from '@/components/common/StatTile';
import { DifficultyBadge } from '@/components/common/Badges';
import { QuestionDetailDialog } from '@/components/common/QuestionDetailDialog';
import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { qualityFlags } from '@/lib/engine';
import { formatDate, num, pct } from '@/lib/format';
import type { PaperSummary, Question } from '@/types';

export function Analytics() {
  const { bankQuestions } = useData();
  const [selected, setSelected] = useState<Question | null>(null);
  const [sittings, setSittings] = useState<PaperSummary[]>([]);
  const [programFilter, setProgramFilter] = useState('all');

  // Each sitting analysed on its own — the bank-wide figures above pool every
  // exam together, which is the wrong lens for asking how one test performed.
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ papers: PaperSummary[] }>('/analytics/papers')
      .then((d) => { if (!cancelled) setSittings(d.papers); })
      .catch(() => { if (!cancelled) setSittings([]); });
    return () => { cancelled = true; };
  }, []);

  // Filtered in the browser rather than refetched: the whole list is a handful
  // of rows, and the endpoint's own programId filter exists for callers that
  // are not holding all of them already.
  const programOptions = useMemo(
    () => [...new Map(
      sittings
        .filter((p) => p.programId)
        .map((p) => [p.programId as string, p.programName ?? p.programId as string]),
    ).entries()],
    [sittings],
  );
  const visibleSittings = useMemo(
    () => (programFilter === 'all'
      ? sittings
      : sittings.filter((p) => p.programId === programFilter)),
    [sittings, programFilter],
  );

  const difficultyDist = useMemo<BarDatum[]>(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    bankQuestions.forEach((q) => { counts[q.difficultyTag]++; });
    return [
      { label: 'Easy', value: counts.Easy, color: 'var(--difficulty-easy)' },
      { label: 'Medium', value: counts.Medium, color: 'var(--difficulty-medium)' },
      { label: 'Hard', value: counts.Hard, color: 'var(--difficulty-hard)' },
    ];
  }, [bankQuestions]);

  const subjectVolume = useMemo<BarDatum[]>(() => {
    const map = new Map<string, number>();
    bankQuestions.forEach((q) => map.set(q.subjectName ?? 'N/A', (map.get(q.subjectName ?? 'N/A') ?? 0) + q.attemptCount));
    return [...map.entries()].map(([label, value]) => ({ label, value, color: 'var(--series-1)' }));
  }, [bankQuestions]);

  const totalAttempts = bankQuestions.reduce((s, q) => s + q.attemptCount, 0);
  const withData = bankQuestions.filter((q) => q.attemptCount > 0).length;

  const needsAttention = useMemo(
    () => bankQuestions
      .map((q) => ({ q, flags: qualityFlags(q.discriminationStatus, q.attemptCount, q.contradiction, q.stats?.nonfunctionalDistractors) }))
      .filter((x) => x.flags.length > 0)
      .sort((a, b) => (a.q.irt?.a ?? 0) - (b.q.irt?.a ?? 0)),
    [bankQuestions],
  );

  return (
    <div className="space-y-6">
      <PageHeader help="analytics" title="Item analytics" description="Bank-wide difficulty distribution, response volume, and items that need attention.">
        <Button asChild variant="outline"><Link to="/app/item-analysis"><LineChart className="size-4" /> Item analysis</Link></Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Questions in bank" value={bankQuestions.length} icon={Layers} accent="var(--series-1)" />
        <StatTile label="Total attempts" value={totalAttempts.toLocaleString()} icon={Database} accent="var(--series-2)" />
        <StatTile label="Items with data" value={`${withData}/${bankQuestions.length}`} icon={BarChart3} accent="var(--series-5)" />
        <StatTile label="Flagged items" value={needsAttention.length} icon={AlertTriangle} accent="var(--series-6)" hint="Poor / negative discrimination" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5">Difficulty distribution<HelpHint id="difficultyScore" /></CardTitle></CardHeader>
          <CardContent><BarChart data={difficultyDist} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Response volume by subject</CardTitle></CardHeader>
          <CardContent><BarChart data={subjectVolume} /></CardContent>
        </Card>
      </div>

      {sittings.length > 0 && (
        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Sittings analysed</CardTitle>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                Each exam fitted against its own cohort. Reliability is KR-20: how consistently the paper
                as a whole separates candidates — 0.7 is the usual floor for a test that decides admissions.
                Filter by qualification before comparing: a nursing intake and a medical technology intake
                are different populations sitting different papers.
              </p>
            </div>
            {programOptions.length > 1 && (
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All qualifications</SelectItem>
                  {programOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Exam</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Sat</TableHead>
                  <TableHead className="text-right">Candidates</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                  <TableHead className="text-right">KR-20</TableHead>
                  <TableHead className="text-right">Flagged</TableHead>
                  <TableHead className="text-right">Misfit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSittings.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-xs">
                      <Link to={`/app/examiner/papers/${p.id}`} className="line-clamp-1 text-sm font-medium hover:underline">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.programName ?? 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(p.examDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.stats?.nCandidates ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.stats?.nItems ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(p.stats?.meanScore, 1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(p.stats?.reliability)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.stats?.flagged ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.stats?.misfitting ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-1.5">Needs attention<HelpHint id="needsAttention" /></CardTitle>
          <Badge variant="serious">{needsAttention.length}</Badge>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>ID</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Discrim. (a)</TableHead>
              <TableHead>Issue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needsAttention.map(({ q, flags }) => (
              <TableRow key={q.id} className="cursor-pointer" onClick={() => setSelected(q)}>
                <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
                <TableCell className="max-w-xs"><p className="line-clamp-1 text-sm">{q.stem}</p></TableCell>
                <TableCell><DifficultyBadge level={q.difficultyTag} /></TableCell>
                <TableCell className="tabular-nums">{q.irt ? num(q.irt.a) : 'N/A'}</TableCell>
                <TableCell><Badge variant={flags[0].tone === 'critical' ? 'critical' : flags[0].tone === 'serious' ? 'serious' : 'warning'}>{flags[0].label}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <QuestionDetailDialog question={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}
