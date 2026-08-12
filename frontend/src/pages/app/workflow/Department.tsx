import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { RequestStatusBadge, DifficultyBadge } from '@/components/common/Badges';
import { StatTile } from '@/components/common/StatTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/DataContext';
import { initials } from '@/lib/format';

export function Department() {
  const { requests, questions, users, assignRequest } = useData();
  const faculty = users.filter((u) => u.role === 'faculty');

  const facultyStats = useMemo(() => faculty.map((f) => {
    const authored = questions.filter((q) => q.authorId === f.id);
    const inBank = authored.filter((q) => q.status === 'in_bank').length;
    const pending = authored.filter((q) => !['in_bank', 'rejected', 'retired'].includes(q.status)).length;
    const assigned = requests.filter((r) => r.assignedTo === f.id).length;
    return { f, authored: authored.length, inBank, pending, assigned };
  }), [faculty, questions, requests]);

  const assign = async (requestId: string, facultyId: string) => {
    try {
      await assignRequest(requestId, facultyId);
      toast.success('Request assigned.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not assign the request.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader help="department" title="Department" description="Monitor request progress and assign work to faculty members." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Faculty members" value={faculty.length} icon={Users} accent="var(--series-1)" />
        <StatTile label="Open requests" value={requests.filter((r) => r.status !== 'Completed').length} icon={FileText} accent="var(--series-5)" />
        <StatTile label="Pending questions" value={questions.filter((q) => ['submitted', 'under_departmental_review', 'correction_required', 'under_med_edu_review'].includes(q.status)).length} accent="var(--series-8)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {facultyStats.map(({ f, authored, inBank, pending, assigned }) => (
          <Link key={f.id} to={`/app/department/${f.id}`} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="size-11">
                  <AvatarFallback style={{ background: 'color-mix(in oklab, var(--series-2), transparent 82%)', color: 'var(--series-2)' }}>
                    {initials(f.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.department} · {assigned} assigned</p>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span><span className="font-semibold text-foreground">{authored}</span> authored</span>
                    <span><span className="font-semibold text-success">{inBank}</span> in bank</span>
                    <span><span className="font-semibold text-warning">{pending}</span> pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Scope</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assign</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="text-sm font-medium">{r.subtopicName}</p>
                  <p className="text-xs text-muted-foreground">{r.subjectName}</p>
                </TableCell>
                <TableCell><DifficultyBadge level={r.difficulty} /></TableCell>
                <TableCell className="w-36">
                  <div className="flex items-center gap-2">
                    <Progress value={(r.submitted / r.qCount) * 100} className="w-20" />
                    <span className="text-xs tabular-nums text-muted-foreground">{r.submitted}/{r.qCount}</span>
                  </div>
                </TableCell>
                <TableCell><RequestStatusBadge status={r.status} /></TableCell>
                <TableCell>
                  <Select value={r.assignedTo ?? ''} onValueChange={(v) => void assign(r.id, v)}>
                    <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Assign faculty" /></SelectTrigger>
                    <SelectContent>
                      {faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
