import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { PageLoader } from '@/components/common/PageLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Status = 'ok' | 'info' | 'warn' | 'fail';

interface Check {
  key: string;
  title: string;
  category: string;
  status: Status;
  summary: string;
  remedy: string | null;
  samples: Record<string, unknown>[];
  count: number;
}

interface Report {
  checks: Check[];
  tally: Record<Status, number>;
  healthy: boolean;
}

const STATUS_META: Record<Status, { label: string; variant: 'good' | 'neutral' | 'warning' | 'critical'; icon: typeof CheckCircle2 }> = {
  ok: { label: 'Pass', variant: 'good', icon: CheckCircle2 },
  info: { label: 'Info', variant: 'neutral', icon: Info },
  warn: { label: 'Warning', variant: 'warning', icon: AlertTriangle },
  fail: { label: 'Failed', variant: 'critical', icon: XCircle },
};

/** Failures first, then warnings — nobody opens this page to read the passes. */
const ORDER: Status[] = ['fail', 'warn', 'info', 'ok'];

export function Diagnostics() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setReport(await api.get<Report>('/diagnostics'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the checks.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!report && !error) return <PageLoader />;

  const checks = report ? [...report.checks].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        help="diagnostics"
        title="Diagnostics"
        description="Read-only health checks over the database and this server's configuration."
      >
        <Button variant="outline" onClick={() => void load()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Re-run
        </Button>
      </PageHeader>

      {error && (
        <Card className="border-critical/40">
          <CardContent className="py-4 text-sm text-critical">{error}</CardContent>
        </Card>
      )}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Failed"
              value={report.tally.fail}
              accent="var(--critical)"
              hint={report.healthy ? 'Nothing is broken' : 'Needs attention now'}
            />
            <StatTile label="Warnings" value={report.tally.warn} accent="var(--warning)" hint="Drifting, or work never ran" />
            <StatTile label="Passed" value={report.tally.ok} accent="var(--success)" hint="Checked and clean" />
            <StatTile label="Informational" value={report.tally.info} hint="No action implied" />
          </div>

          <div className="space-y-3">
            {checks.map((check) => {
              const meta = STATUS_META[check.status];
              const Icon = meta.icon;
              return (
                <Card
                  key={check.key}
                  className={cn(
                    check.status === 'fail' && 'border-critical/40',
                    check.status === 'warn' && 'border-warning/40',
                  )}
                >
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            check.status === 'ok' && 'text-success',
                            check.status === 'warn' && 'text-warning',
                            check.status === 'fail' && 'text-critical',
                            check.status === 'info' && 'text-muted-foreground',
                          )}
                        />
                        {check.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{check.summary}</p>
                      {check.remedy && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">What to do: </span>
                          {check.remedy}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {check.category}
                      </Badge>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                  </CardHeader>

                  {check.samples.length > 0 && (
                    <CardContent className="pt-0">
                      {/* Raw rows rather than prose: the point of a sample is to be
                          pasted into a query, so it is shown exactly as returned. */}
                      <div className="overflow-x-auto rounded-md border border-border bg-muted/40">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              {Object.keys(check.samples[0]).map((col) => (
                                <th key={col} className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {check.samples.map((row, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                {Object.keys(check.samples[0]).map((col) => (
                                  <td key={col} className="px-3 py-1.5 font-mono tabular-nums">
                                    {typeof row[col] === 'object'
                                      ? JSON.stringify(row[col])
                                      : String(row[col] ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {check.count > check.samples.length && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Showing {check.samples.length} of {check.count}.
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
