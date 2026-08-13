import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileUp, File, X, Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export function AddQuestion() {
  const { session } = useAuth();
  const { requests, uploadSubmissionPdf } = useData();
  const navigate = useNavigate();
  
  const myRequests = useMemo(() => requests.filter((r) => r.assignedTo === session?.id && r.status !== 'completed'), [requests, session?.id]);

  const [requestId, setRequestId] = useState<string>('');
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
    if (!requestId) {
      toast.error('Please select an assigned request to fulfill.');
      return;
    }
    if (!file) {
      toast.error('Please upload a PDF file.');
      return;
    }
    
    setBusy(true);
    try {
      await uploadSubmissionPdf(requestId, file, references);
      toast.success('PDF successfully uploaded and sent for SME review!');
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
        description="Fulfill an assigned question request by uploading a Cambridge past paper PDF." 
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <Label>Assigned Request</Label>
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

          <div className="space-y-3">
            <Label>PDF File</Label>
            <div 
              className={`border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${file ? 'bg-secondary/20' : 'hover:bg-secondary/40'} cursor-pointer`}
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
                  <FileUp className="size-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">Click or drag PDF here</h3>
                  <p className="text-sm text-muted-foreground mt-1">Maximum file size: 50MB</p>
                </>
              )}
              <input type="file" accept="application/pdf" className="hidden" ref={inputRef} onChange={handleFile} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Reference source (optional)</Label>
            <Input 
              placeholder="e.g. 9700/12/M/J/23" 
              value={references} 
              onChange={(e) => setReferences(e.target.value)} 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button variant="outline" onClick={() => navigate('/app/faculty')}>Cancel</Button>
            <Button onClick={submit} disabled={!file || !requestId || busy}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Upload and submit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
