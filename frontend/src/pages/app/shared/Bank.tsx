import { useMemo, useState } from 'react';
import {
  type ColumnDef, type SortingState, flexRender, getCoreRowModel,
  getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Layers, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DifficultyBadge } from '@/components/common/Badges';
import { QuestionDetailDialog } from '@/components/common/QuestionDetailDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/DataContext';
import { num } from '@/lib/format';
import type { Difficulty, Question } from '@/types';

export function Bank() {
  const { bankQuestions, taxonomy } = useData();
  const [globalFilter, setGlobalFilter] = useState('');
  const [subject, setSubject] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<Question | null>(null);

  const filtered = useMemo(
    () => bankQuestions.filter((q) =>
      (subject === 'all' || q.subjectId === subject) &&
      (difficulty === 'all' || q.difficultyTag === difficulty),
    ),
    [bankQuestions, subject, difficulty],
  );

  const columns = useMemo<ColumnDef<Question>[]>(() => [
    {
      accessorKey: 'publicId',
      header: 'ID',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.publicId}</span>,
    },
    {
      accessorKey: 'stem',
      header: 'Question',
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="line-clamp-2 text-sm text-foreground">{row.original.stem}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.original.topicName} · {row.original.subtopicName}</p>
        </div>
      ),
    },
    {
      accessorKey: 'difficultyTag',
      header: 'Difficulty',
      cell: ({ row }) => <DifficultyBadge level={row.original.difficultyTag} />,
    },
    {
      accessorKey: 'attemptCount',
      header: ({ column }) => <SortHead column={column} label="Attempts" />,
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.attemptCount || 'N/A'}</span>,
    },
    {
      id: 'discrimination',
      accessorFn: (q) => q.irt?.a ?? -99,
      header: ({ column }) => <SortHead column={column} label="Discrim. (a)" />,
      cell: ({ row }) => {
        const a = row.original.irt?.a;
        if (a == null) return <span className="text-sm text-muted-foreground">N/A</span>;
        return <span className={a < 0 ? 'text-critical' : a < 0.5 ? 'text-serious' : ''}>{num(a)}</span>;
      },
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _id, value) =>
      row.original.stem.toLowerCase().includes(String(value).toLowerCase()) ||
      row.original.publicId.toLowerCase().includes(String(value).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-6">
      <PageHeader help="bank" title="Question bank" description="All approved, locked questions with their live difficulty tags and psychometrics.">
        <Badge variant="neutral">{bankQuestions.length} items</Badge>
      </PageHeader>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by text or ID…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-40" size="sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {taxonomy.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-36" size="sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulty</SelectItem>
              {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Layers} title="No matching questions" description="Try adjusting your search or filters." className="m-4" />
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-border p-3">
            <p className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {filtered.length} items
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <QuestionDetailDialog question={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SortHead({ column, label }: { column: any; label: string }) {
  return (
    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
      {label} <ArrowUpDown className="size-3" />
    </button>
  );
}
