import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckSquare, Download, FileText, Search, Square } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DifficultyBadge } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/context/DataContext';
import { cn } from '@/lib/utils';

export function WorksheetBuilder() {
  const { bankQuestions, taxonomy } = useData();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const filtered = useMemo(() => {
    let items = bankQuestions;
    if (subjectFilter !== 'all') items = items.filter((q) => q.subjectId === subjectFilter);
    if (difficultyFilter !== 'all') items = items.filter((q) => q.difficultyTag === difficultyFilter);
    if (query) items = items.filter((q) => q.stem.toLowerCase().includes(query.toLowerCase()));
    return items;
  }, [bankQuestions, subjectFilter, difficultyFilter, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((q) => q.id)));
  };

  const handleGenerate = () => {
    toast.info('Worksheet generation is not yet implemented. This feature will be available in a future release.');
  };

  const selectedQuestions = bankQuestions.filter((q) => selected.has(q.id));

  return (
    <div className="space-y-6">
      <PageHeader help="worksheetBuilder"
        title="Worksheet builder"
        description="Select questions from the bank and generate a printable worksheet."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search questions…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {taxonomy.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Question table */}
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No questions found" description="No questions in the bank match your filters." />
          ) : (
            <Card className="gap-0 overflow-hidden p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">
                        <button type="button" onClick={selectAll} className="text-muted-foreground hover:text-foreground">
                          {selected.size === filtered.length && filtered.length > 0
                            ? <CheckSquare className="size-4" />
                            : <Square className="size-4" />}
                        </button>
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Stem</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Difficulty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((q) => (
                      <TableRow
                        key={q.id}
                        className={cn('cursor-pointer', selected.has(q.id) && 'bg-accent/50')}
                        onClick={() => toggle(q.id)}
                      >
                        <TableCell>
                          {selected.has(q.id)
                            ? <CheckSquare className="size-4 text-primary" />
                            : <Square className="size-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{q.publicId}</TableCell>
                        <TableCell><p className="line-clamp-2 max-w-md text-sm">{q.stem}</p></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{q.subjectName ?? '—'}</TableCell>
                        <TableCell><DifficultyBadge level={q.difficultyTag} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {/* Selection summary panel */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Worksheet summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{selected.size}</p>
                <p className="text-sm text-muted-foreground">question{selected.size !== 1 ? 's' : ''} selected</p>
              </div>

              {selected.size > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Easy</span>
                    <Badge variant="outline">{selectedQuestions.filter((q) => q.difficultyTag === 'Easy').length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medium</span>
                    <Badge variant="outline">{selectedQuestions.filter((q) => q.difficultyTag === 'Medium').length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hard</span>
                    <Badge variant="outline">{selectedQuestions.filter((q) => q.difficultyTag === 'Hard').length}</Badge>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={selected.size === 0}
                onClick={handleGenerate}
              >
                <Download className="size-4" />
                Generate worksheet (PDF)
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                PDF generation will be available in a future update.
              </p>
            </CardContent>
          </Card>

          {selected.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {selectedQuestions.map((q) => (
                    <div key={q.id} className="flex items-start gap-2 rounded-md border bg-muted/30 p-2 text-xs">
                      <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{q.publicId}</Badge>
                      <p className="line-clamp-2 text-muted-foreground">{q.stem}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
