import { useState } from 'react';
import { CheckCircle2, PencilLine, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/DataContext';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';

type Decision = 'accepted' | 'correction_required' | 'rejected';

const OPTIONS: { key: Decision; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { key: 'accepted', label: 'Accept', icon: CheckCircle2, cls: 'data-[on=true]:border-success data-[on=true]:bg-success/10 data-[on=true]:text-success' },
  { key: 'correction_required', label: 'Correction', icon: PencilLine, cls: 'data-[on=true]:border-serious data-[on=true]:bg-serious/10 data-[on=true]:text-serious' },
  { key: 'rejected', label: 'Reject', icon: XCircle, cls: 'data-[on=true]:border-critical data-[on=true]:bg-critical/10 data-[on=true]:text-critical' },
];

export function ReviewDecisionModal({
  question, stage, open, onOpenChange,
}: {
  question: Question | null;
  stage: 'departmental' | 'med_edu';
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { reviewDecision } = useData();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!question) return null;

  const reset = () => { setDecision(null); setRemarks(''); setError(''); };

  const submit = async () => {
    if (!decision) return setError('Select a decision.');
    if (!remarks.trim()) return setError('Remarks are mandatory before any decision.');
    setBusy(true);
    try {
      // The reviewer's identity comes from the bearer token, and the server
      // rejects a stage this role does not own.
      await reviewDecision({ questionId: question.id, stage, decision, remarks: remarks.trim() });
      const verb = decision === 'accepted' ? (stage === 'departmental' ? 'forwarded for final review' : 'approved into the bank') : decision === 'correction_required' ? 'returned for correction' : 'rejected';
      toast.success(`Question ${verb}.`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stage === 'departmental' ? 'SME review' : 'Final review'}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="line-clamp-3">{question.stem}</p>
        </div>

        <div className="space-y-2">
          <Label>Decision</Label>
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                data-on={decision === o.key}
                onClick={() => { setDecision(o.key); setError(''); }}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted',
                  o.cls,
                )}
              >
                <o.icon className="size-5" />
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks <span className="text-critical">*</span></Label>
          <Textarea
            id="remarks"
            placeholder="Record your assessment against the reference. Mandatory for every decision."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
          />
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Submit decision</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
