import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { RequestStatusBadge, DifficultyBadge } from '@/components/common/Badges';
import { StatTile } from '@/components/common/StatTile';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/DataContext';
import { formatDate } from '@/lib/format';
import type { Difficulty } from '@/types';

export function Requests() {
  const { requests, userById } = useData();
  const navigate = useNavigate();
  const active = requests.filter((r) => r.status !== 'Completed').length;
  const totalNeeded = requests.reduce((s, r) => s + r.qCount, 0);
  const submitted = requests.reduce((s, r) => s + r.submitted, 0);

  return (
    <div className="space-y-6">
      <PageHeader help="requests" title="Question requests" description="Generate and track requests that kick off the authoring workflow.">
        <Button variant="outline" onClick={() => navigate('/app/examiner')}>
          <FileText className="size-4" /> Generate paper
        </Button>
        <GenerateRequestDialog />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Active requests" value={active} icon={ClipboardList} accent="var(--series-5)" />
        <StatTile label="Questions requested" value={totalNeeded} accent="var(--series-1)" />
        <StatTile label="Submitted so far" value={`${submitted}/${totalNeeded}`} accent="var(--series-2)" />
      </div>

      <div className="border-y border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-2 border-border">
              <TableHead className="font-semibold text-foreground">Scope</TableHead>
              <TableHead className="font-semibold text-foreground">Type</TableHead>
              <TableHead className="font-semibold text-foreground">Difficulty</TableHead>
              <TableHead className="font-semibold text-foreground">Assigned to</TableHead>
              <TableHead className="font-semibold text-foreground">Progress</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id} className="border-border">
                <TableCell>
                  <p className="text-base font-semibold">{r.subtopicName}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{r.subjectName} · {r.topicName}</p>
                </TableCell>
                <TableCell className="text-sm font-medium">{r.qType}</TableCell>
                <TableCell><DifficultyBadge level={r.difficulty} /></TableCell>
                <TableCell className="text-sm font-medium">{r.assignedTo ? userById(r.assignedTo)?.name : <span className="text-muted-foreground font-normal">Unassigned</span>}</TableCell>
                <TableCell className="w-48">
                  <div className="flex items-center gap-3">
                    <Progress value={(r.submitted / r.qCount) * 100} className="w-24 h-2" />
                    <span className="text-xs font-bold tabular-nums text-foreground">{r.submitted} / {r.qCount}</span>
                  </div>
                </TableCell>
                <TableCell><RequestStatusBadge status={r.status} /></TableCell>
                <TableCell className="text-xs font-medium text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GenerateRequestDialog() {
  const { taxonomy, generateRequest } = useData();
  const [open, setOpen] = useState(false);
  const [subtopicId, setSubtopicId] = useState('');
  const [count, setCount] = useState('3');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subtopicId) return;
    setBusy(true);
    try {
      // The server resolves the subject/topic names from the subtopic.
      await generateRequest({ subtopicId, qType: 'MCQ', qCount: Number(count) || 1, difficulty });
      toast.success('Request generated and ready for assignment.');
      setOpen(false);
      setSubtopicId('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> New request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate a question request</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Topic</Label>
            <Select value={subtopicId} onValueChange={setSubtopicId}>
              <SelectTrigger><SelectValue placeholder="Choose a topic" /></SelectTrigger>
              <SelectContent>
                {taxonomy.subtopics.map((s) => {
                  const topic = taxonomy.topics.find((x) => x.id === s.topicId);
                  const subj = taxonomy.subjects.find((x) => x.id === s.subjectId);
                  return (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {subj?.name} › {topic?.name} › {s.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="count">Number of questions</Label>
              <Input id="count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!subtopicId || busy}>Generate request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
