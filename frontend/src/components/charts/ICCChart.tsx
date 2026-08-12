import { useMemo } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import { icc } from '@/lib/engine';
import { TooltipShell, TooltipRow } from './ChartTooltip';
import type { EmpiricalPoint, ICCCurve, IRTParams } from '@/types';

interface ICCChartProps {
  irt: IRTParams;
  /**
   * The 100-point curve the server computed via compute_icc_curve(). Preferred
   * when present so the chart shows exactly what was stored at calibration
   * time; the local 3PL evaluation is the fallback for list payloads, which
   * carry a/b/c but not the curve.
   */
  curve?: ICCCurve | null;
  /**
   * What candidates actually did, grouped into ability deciles. Plotted as
   * points over the modelled line: how close they sit to it *is* the evidence
   * that the fit means anything, and it is the one thing a reviewer can judge
   * without knowing what a mean-square residual is.
   */
  empirical?: EmpiricalPoint[] | null;
  height?: number;
  /** overlay the operating point at b (50% ability) */
  showMarkers?: boolean;
}

export function ICCChart({ irt, curve, empirical, height = 260, showMarkers = true }: ICCChartProps) {
  const data = useMemo(() => {
    if (curve?.theta?.length && curve.theta.length === curve.probability.length) {
      return curve.theta.map((theta, i) => ({ theta, p: curve.probability[i] }));
    }
    const pts: { theta: number; p: number }[] = [];
    for (let t = -3; t <= 3.0001; t += 0.1) {
      pts.push({ theta: Number(t.toFixed(2)), p: icc(t, irt) });
    }
    return pts;
  }, [irt, curve]);

  const observed = useMemo(
    () => (empirical ?? []).map((point) => ({
      theta: point.theta, observed: point.observed, expected: point.expected, n: point.n,
    })),
    [empirical],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <defs>
          <linearGradient id="iccFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="theta" type="number" domain={[-3, 3]} ticks={[-3, -2, -1, 0, 1, 2, 3]}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          stroke="var(--chart-axis)"
          label={{ value: 'Student ability (θ)', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          stroke="var(--chart-axis)"
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as {
              theta: number; p?: number; observed?: number; expected?: number; n?: number;
            };
            return (
              <TooltipShell title={`θ = ${d.theta.toFixed(1)}`}>
                {d.p !== undefined && (
                  <TooltipRow label="Modelled" value={`${Math.round(d.p * 100)}%`} color="var(--series-1)" />
                )}
                {d.observed !== undefined && (
                  <>
                    <TooltipRow label="Observed" value={`${Math.round(d.observed * 100)}%`} color="var(--series-6)" />
                    <TooltipRow label="Expected here" value={`${Math.round((d.expected ?? 0) * 100)}%`} />
                    <TooltipRow label="Candidates" value={String(d.n ?? 0)} />
                  </>
                )}
              </TooltipShell>
            );
          }}
        />
        <Area type="monotone" dataKey="p" stroke="none" fill="url(#iccFill)" />
        <Line type="monotone" dataKey="p" stroke="var(--series-1)" strokeWidth={2.25} dot={false} />
        {observed.length > 0 && (
          <Scatter
            data={observed}
            dataKey="observed"
            fill="var(--series-6)"
            shape="circle"
            legendType="none"
            isAnimationActive={false}
          />
        )}
        {showMarkers && (
          <>
            <ReferenceLine y={irt.c} stroke="var(--chart-axis)" strokeDasharray="4 4"
              label={{ value: 'guessing (c)', fontSize: 10, fill: 'var(--muted-foreground)', position: 'insideLeft' }} />
            <ReferenceLine x={irt.b} stroke="var(--series-6)" strokeDasharray="4 4"
              label={{ value: 'b', fontSize: 10, fill: 'var(--series-6)', position: 'top' }} />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
