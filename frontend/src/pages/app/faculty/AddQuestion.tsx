import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileUp, FileText, X, Loader2, Save, BookOpen, FileCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

// Inline reusable file drop zone

function PdfDropZone({
  label,
  hint,
  icon: Icon,
  file,
  onFile,
  onClear,
  inputRef,
}: {
  label: string;
  hint: string;
  icon: React.ElementType;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.type === 'application/pdf') onFile(f);
    else toast.error('Please drop a valid PDF file.');
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer
          ${file
            ? 'border-primary/40 bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-secondary/30'
          }`}
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center gap-3 w-full px-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="p-3 rounded-full bg-muted mb-3">
              <Icon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Click or drag to upload</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF only · Max 50 MB</p>
          </>
        )}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          ref={inputRef}
          onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
        />
      </div>
    </div>
  );
}

// Add Question Page Component

export function AddQuestion() {
  const { session } = useAuth();
  const { requests, uploadSubmissionPdf } = useData();
  const navigate = useNavigate();

  const myRequests = useMemo(
    () => requests.filter((r) => r.assignedTo === session?.id && r.status !== 'Completed'),
    [requests, session?.id],
  );

  const [requestId, setRequestId] = useState<string>('');
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [references, setReferences] = useState('');
  const [busy, setBusy] = useState(false);

  const qpRef = useRef<HTMLInputElement>(null);
  const msRef = useRef<HTMLInputElement>(null);

  const canSubmit = !!requestId && !!qpFile && !!msFile;

  const submit = async () => {
    if (!requestId) { toast.error('Please select an assigned request.'); return; }
    if (!qpFile)    { toast.error('Please upload the Question Paper PDF.'); return; }
    if (!msFile)    { toast.error('Please upload the Mark Scheme PDF.'); return; }

    setBusy(true);
    try {
      await uploadSubmissionPdf(requestId, qpFile, references, msFile);
      toast.success('Both PDFs uploaded successfully! Sent for SME review.');
      navigate('/app/faculty');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        help="facultyDashboard"
        title="Upload Past Paper"
        description="Fulfill an assigned question request by uploading the Question Paper and its Mark Scheme PDF."
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Request selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Assigned Request</Label>
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a request to fulfill..." />
              </SelectTrigger>
              <SelectContent>
                {myRequests.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.subjectName} · {r.topicName} · {r.subtopicName} ({r.qCount} Qs)
                  </SelectItem>
                ))}
                {myRequests.length === 0 && (
                  <SelectItem value="none" disabled>No active requests assigned to you</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* PDF upload zones */}
          <div className="grid gap-5 sm:grid-cols-2">
            <PdfDropZone
              label="Question Paper PDF"
              hint="The Cambridge QP file containing all exam questions."
              icon={BookOpen}
              file={qpFile}
              onFile={setQpFile}
              onClear={() => setQpFile(null)}
              inputRef={qpRef}
            />
            <PdfDropZone
              label="Mark Scheme PDF ✱"
              hint="Required — correct answers and rubrics are only in the MS."
              icon={FileText}
              file={msFile}
              onFile={setMsFile}
              onClear={() => setMsFile(null)}
              inputRef={msRef}
            />
          </div>

          {/* Info banner */}
          <div className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/8 p-3 text-xs text-amber-700 dark:text-amber-400">
            <FileUp className="size-4 mt-0.5 shrink-0" />
            <p>
              Both PDFs are required. The system automatically extracts structured questions and matches
              the correct answer key from the Mark Scheme during SME and QBM review.
            </p>
          </div>

          {/* Reference field */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Reference source <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="e.g. 9700/12/M/J/23"
              value={references}
              onChange={(e) => setReferences(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button variant="outline" onClick={() => navigate('/app/faculty')}>Cancel</Button>
            <Button onClick={submit} disabled={!canSubmit || busy}>
              {busy
                ? <><Loader2 className="mr-2 size-4 animate-spin" /> Uploading…</>
                : <><Save className="mr-2 size-4" /> Upload & Submit</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
