import {
  Bar, BarChart as ReBarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TooltipShell, TooltipRow } from './ChartTooltip';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({
  data, height = 240, unit = '',
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--chart-axis)" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--chart-axis)" allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <TooltipShell title={label as string}>
                <TooltipRow label="Count" value={`${payload[0].value}${unit}`} color={(payload[0].payload as BarDatum).color} />
              </TooltipShell>
            );
          }}
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={54}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? 'var(--series-1)'} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
