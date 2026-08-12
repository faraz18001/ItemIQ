import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, PencilLine, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge, DifficultyBadge } from '@/components/common/Badges';
import { QuestionDetailDialog } from '@/components/common/QuestionDetailDialog';
import { CalibrationChart } from '@/components/charts/CalibrationChart';
import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/DataContext';
import { qualityFlags } from '@/lib/engine';
import { num } from '@/lib/format';
import type { Question } from '@/types';

export function FacultyDetail() {
  const { facultyId } = useParams();
  const { questions, requests, userById } = useData();
  const [selected, setSelected] = useState<Question | null>(null);

  const faculty = facultyId ? userById(facultyId) : undefined;

  const authored = useMemo(
    () => questions.filter((q) => q.authorId === facultyId),
    [questions, facultyId],
  );
  const bankAuthored = useMemo(() => authored.filter((q) => q.status === 'in_bank'), [authored]);
  const inBank = bankAuthored.length;
  // Matches Department.tsx's own "pending" definition (not FacultyDashboard's
  // narrower one), so this page agrees with the card the user drilled in from.
  const pending = authored.filter((q) => !['in_bank', 'rejected', 'retired'].includes(q.status)).length;
  const assigned = requests.filter((r) => r.assignedTo === facultyId).length;

  const difficultyDist = useMemo<BarDatum[]>(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    bankAuthored.forEach((q) => { counts[q.difficultyTag]++; });
    return [
      { label: 'Easy', value: counts.Easy, color: 'var(--difficulty-easy)' },
      { label: 'Medium', value: counts.Medium, color: 'var(--difficulty-medium)' },
      { label: 'Hard', value: counts.Hard, color: 'var(--difficulty-hard)' },
    ];
  }, [bankAuthored]);

  const needsAttention = useMemo(
    () => bankAuthored
      .map((q) => ({
        q,
        flags: qualityFlags(q.discriminationStatus, q.attemptCount, q.contradiction, q.stats?.nonfunctionalDistractors),
      }))
      .filter((x) => x.flags.length > 0),
    [bankAuthored],
  );

  if (!faculty || faculty.role !== 'faculty') {
    return (
      <div className="space-y-6">
        <PageHeader title="Faculty member" description="This account is not a faculty member, or no longer exists." />
        <EmptyState
          icon={Users}
          title="Not found"
          action={<Button asChild variant="outline"><Link to="/app/department"><ArrowLeft className="size-4" /> Back to Department</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader help="facultyDetail" title={faculty.name} description={`${faculty.department || 'No department set'} · ${faculty.email}`}>
        <Button asChild variant="outline"><Link to="/app/department"><ArrowLeft className="size-4" /> Back</Link></Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Authored" value={authored.length} icon={FileText} accent="var(--series-1)" />
        <StatTile label="In bank" value={inBank} icon={CheckCircle2} accent="var(--series-2)" />
        <StatTile label="Pending" value={pending} icon={PencilLine} accent="var(--series-8)" />
        <StatTile label="Assigned requests" value={assigned} icon={ClipboardList} accent="var(--series-5)" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calibration</CardTitle>
        </CardHeader>
        <CardContent>
          <CalibrationChart questions={authored} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Difficulty distribution</CardTitle></CardHeader>
          <CardContent><BarChart data={difficultyDist} /></CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Needs attention</CardTitle>
            <Badge variant={needsAttention.length ? 'serious' : 'neutral'}>{needsAttention.length}</Badge>
          </CardHeader>
          {needsAttention.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing flagged" className="m-4 py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>ID</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsAttention.map(({ q, flags }) => (
                  <TableRow key={q.id} className="cursor-pointer" onClick={() => setSelected(q)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
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
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader><CardTitle>Authored questions ({authored.length})</CardTitle></CardHeader>
        {authored.length === 0 ? (
          <EmptyState icon={FileText} title="Nothing authored yet" className="m-4 py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Discrim. (a)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authored.map((q) => (
                <TableRow key={q.id} className="cursor-pointer" onClick={() => setSelected(q)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
                  <TableCell className="max-w-sm"><p className="line-clamp-1 text-sm">{q.stem}</p></TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell><DifficultyBadge level={q.difficultyTag} /></TableCell>
                  <TableCell className="tabular-nums text-sm">{q.attemptCount || 'N/A'}</TableCell>
                  <TableCell className="tabular-nums text-sm">{q.irt ? num(q.irt.a) : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <QuestionDetailDialog question={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}
