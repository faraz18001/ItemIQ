import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/DataContext';
import { toast } from 'sonner';
import { Loader2, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { PdfSubmission } from '@/types';

interface SubmissionReviewModalProps {
  submission: PdfSubmission | null;
  stage: 'departmental' | 'med_edu';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionReviewModal({ submission, stage, open, onOpenChange }: SubmissionReviewModalProps) {
  const { reviewSubmission } = useData();
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (decision: 'accepted' | 'correction_required' | 'rejected') => {
    if (!submission) return;
    if (decision !== 'accepted' && !remarks.trim()) {
      toast.error('Please provide remarks for returning or rejecting the file.');
      return;
    }
    setBusy(true);
    try {
      await reviewSubmission({ submissionId: submission.id, stage, decision, remarks });
      toast.success(`Submission ${decision.replace('_', ' ')} successfully.`);
      setRemarks('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setBusy(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Review Uploaded PDF</DialogTitle>
          <DialogDescription>
            {stage === 'departmental' 
              ? 'Review this past paper submission before forwarding it to the QBM.'
              : 'Final QBM approval will immediately trigger the PyMuPDF parser to extract questions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-md border border-border">
            <FileText className="size-8 text-serious" />
            <div>
              <p className="font-semibold text-sm break-all">{submission.pdfPath ? submission.pdfPath.split('/').pop() : 'Unknown file'}</p>
              <p className="text-xs text-muted-foreground">Uploaded at {new Date(submission.createdAt).toLocaleString()}</p>
            </div>

          </div>

          <div className="space-y-2">
            <Label>Remarks (Required for corrections/rejection)</Label>
            <Textarea 
              placeholder="e.g. The PDF is blurry or the wrong year was uploaded..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 border-t border-border pt-4">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto text-critical border-critical hover:bg-critical/10"
            disabled={busy} 
            onClick={() => submit('rejected')}
          >
            <XCircle className="size-4 mr-2" /> Reject
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full sm:w-auto text-warning border-warning hover:bg-warning/10"
            disabled={busy} 
            onClick={() => submit('correction_required')}
          >
            <AlertTriangle className="size-4 mr-2" /> Needs Correction
          </Button>
          
          <div className="flex-1 hidden sm:block" />
          
          <Button 
            className="w-full sm:w-auto"
            disabled={busy} 
            onClick={() => submit('accepted')}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
            Approve PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
