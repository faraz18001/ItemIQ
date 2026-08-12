import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

/** Must match MIN_PASSWORD_LENGTH in api/schemas.py. */
const MIN_PASSWORD = 8;

export function ChangePasswordDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError('');
  };

  const submit = async () => {
    setError('');
    if (next.length < MIN_PASSWORD) {
      return setError(`Your new password must be at least ${MIN_PASSWORD} characters.`);
    }
    if (next !== confirm) return setError('The two new passwords do not match.');

    setBusy(true);
    try {
      // The server re-checks the current password; this is not a client-side gate.
      await api.post('/auth/password', { currentPassword: current, newPassword: next });
      toast.success('Password changed.');
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-current">Current password</Label>
            <Input
              id="pw-current" type="password" autoComplete="current-password"
              value={current} onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-new">New password</Label>
            <Input
              id="pw-new" type="password" autoComplete="new-password"
              value={next} onChange={(e) => setNext(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD} characters`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm" type="password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={busy || !current || !next}>
            {busy && <Loader2 className="size-4 animate-spin" />} Change password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
