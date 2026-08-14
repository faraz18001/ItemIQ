import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, FileCheck, X, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { toast } from 'sonner';

interface UploadPdfModalProps {
  requestId: string | null;
  onOpenChange: (open: boolean) => void;
}

function MiniDropZone({
  label, hint, file, onFile, onClear,
}: {
  label: string; hint: string; file: File | null;
  onFile: (f: File) => void; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.type === 'application/pdf') onFile(f);
    else toast.error('Please drop a valid PDF file.');
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-secondary/20'}`}
        onClick={() => !file && ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop}
      >
        {file ? (
          <div className="flex items-center gap-2">
            <FileCheck className="size-4 text-primary shrink-0" />
            <span className="text-xs font-medium truncate flex-1 text-left">{file.name}</span>
            <Button variant="ghost" size="icon" className="size-5 shrink-0" onClick={(e) => { e.stopPropagation(); onClear(); }}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-2">
            <FileUp className="size-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Click or drag PDF</span>
          </div>
        )}
        <input type="file" accept="application/pdf" className="hidden" ref={ref}
          onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
      </div>
    </div>
  );
}

export function UploadPdfModal({ requestId, onOpenChange }: UploadPdfModalProps) {
  const { uploadSubmissionPdf } = useData();
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [references, setReferences] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setQpFile(null); setMsFile(null); setReferences(''); };

  const submit = async () => {
    if (!requestId || !qpFile || !msFile) return;
    setBusy(true);
    try {
      await uploadSubmissionPdf(requestId, qpFile, references, msFile);
      toast.success('Both PDFs uploaded and sent for SME review!');
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!requestId} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload past paper PDFs</DialogTitle>
          <DialogDescription>
            Both the Question Paper and Mark Scheme are required. The parser will extract structured questions after QBM approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <MiniDropZone
              label="Question Paper PDF"
              hint="The QP file containing exam questions."
              file={qpFile}
              onFile={setQpFile}
              onClear={() => setQpFile(null)}
            />
            <MiniDropZone
              label="Mark Scheme PDF ✱"
              hint="Required — answers are only in the MS."
              file={msFile}
              onFile={setMsFile}
              onClear={() => setMsFile(null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reference source <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="e.g. 9700/12/M/J/23"
              value={references}
              onChange={(e) => setReferences(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={!qpFile || !msFile || busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Upload & submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
