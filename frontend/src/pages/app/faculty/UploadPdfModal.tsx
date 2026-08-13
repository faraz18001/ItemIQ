import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, File, X, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { toast } from 'sonner';

interface UploadPdfModalProps {
  requestId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function UploadPdfModal({ requestId, onOpenChange }: UploadPdfModalProps) {
  const { uploadSubmissionPdf } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [references, setReferences] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]?.type === 'application/pdf') {
      setFile(e.dataTransfer.files[0]);
    } else {
      toast.error('Please drop a valid PDF file.');
    }
  };

  const submit = async () => {
    if (!requestId || !file) return;
    setBusy(true);
    try {
      await uploadSubmissionPdf(requestId, file, references);
      toast.success('PDF successfully uploaded and sent for SME review!');
      onOpenChange(false);
      setFile(null);
      setReferences('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!requestId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload past paper PDF</DialogTitle>
          <DialogDescription>
            Upload a Cambridge past paper. The parser will extract the questions automatically after QBM approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div 
            className={`border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center transition-colors ${file ? 'bg-secondary/20' : 'hover:bg-secondary/40'} cursor-pointer`}
            onClick={() => !file && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center gap-3 w-full p-4 bg-background border border-border rounded-md shadow-sm">
                <File className="size-8 text-serious" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <FileUp className="size-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Click or drag PDF here</h3>
                <p className="text-sm text-muted-foreground mt-1">Maximum file size: 50MB</p>
              </>
            )}
            <input type="file" accept="application/pdf" className="hidden" ref={inputRef} onChange={handleFile} />
          </div>

          <div className="space-y-3">
            <Label>Reference source (optional)</Label>
            <Input 
              placeholder="e.g. 9700/12/M/J/23" 
              value={references} 
              onChange={(e) => setReferences(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!file || busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Upload and submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
