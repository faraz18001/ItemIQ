import { useMemo } from 'react';
import {
  CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TooltipShell, TooltipRow } from './ChartTooltip';
import { MIN_ATTEMPTS } from '@/lib/engine';
import { formatDate } from '@/lib/format';
import type { Question } from '@/types';

interface CalibrationPoint {
  date: string;
  publicId: string;
  vsAi: number;
  vsStudent: number | null;
}

/**
 * How a faculty member's own difficulty estimate compares to the other two
 * signals, ordered by when each question was authored.
 *
 * The two series are not the same kind of claim. AI is one opinion in the
 * blend, not ground truth, so a faculty/AI gap only ever means "these two
 * disagreed" — it is plotted as agreement, never accuracy. The student
 * signal reflects observed exam performance, so it is the only comparison
 * here that can honestly be called accuracy — and only once IRT has actually
 * converged (gated on MIN_ATTEMPTS, same floor the rest of the app uses).
 */
export function CalibrationChart({ questions }: { questions: Question[] }) {
  const data = useMemo<CalibrationPoint[]>(
    () =>
      [...questions]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((q) => ({
          date: formatDate(q.createdAt),
          publicId: q.publicId,
          vsAi: Number((q.facultySignal - q.aiSignal).toFixed(2)),
          vsStudent:
            q.studentSignal != null && q.attemptCount >= MIN_ATTEMPTS
              ? Number((q.facultySignal - q.studentSignal).toFixed(2))
              : null,
        })),
    [questions],
  );

  if (data.length === 0) {
    return <EmptyState icon={TrendingUp} title="No authored questions yet" className="py-8" />;
  }

  const hasStudentData = data.some((d) => d.vsStudent != null);

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="publicId" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--chart-axis)" />
          <YAxis domain={[-0.5, 0.5]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--chart-axis)" />
          <ReferenceLine y={0} stroke="var(--chart-axis)" strokeDasharray="3 3" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as CalibrationPoint;
              return (
                <TooltipShell title={`${label} · ${point.date}`}>
                  <TooltipRow label="vs AI (agreement)" value={point.vsAi.toFixed(2)} color="var(--series-1)" />
                  {point.vsStudent != null && (
                    <TooltipRow label="vs students (accuracy)" value={point.vsStudent.toFixed(2)} color="var(--series-2)" />
                  )}
                </TooltipShell>
              );
            }}
          />
          <Line type="monotone" dataKey="vsAi" name="Agreement with AI" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="vsStudent" name="Accuracy vs. students" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: 'var(--series-1)' }} /> Agreement with AI</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: 'var(--series-2)' }} /> Accuracy vs. observed student performance</span>
      </div>
      {!hasStudentData && (
        <p className="text-xs text-muted-foreground">
          None of this faculty member&apos;s items have accumulated enough student responses yet to
          compare against observed performance — only the AI-agreement line has data so far.
        </p>
      )}
    </div>
  );
}
