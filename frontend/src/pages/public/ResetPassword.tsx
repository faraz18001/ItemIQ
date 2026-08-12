import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const MIN_PASSWORD = 8;

/**
 * Setting a new password from an emailed link.
 *
 * The token stays in the query string and is never written to storage: this
 * page is the end of its life, and a token in localStorage outlives the tab
 * that legitimately needed it.
 */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12 text-center">
        <Brand className="mb-8 self-center" />
        <h1 className="text-2xl font-semibold tracking-tight">Link incomplete</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This address is missing its reset token. Open the link from your email directly,
          or request a new one.
        </p>
        <Button asChild className="mt-6 self-center">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <Brand className="mb-8 self-center" />
      <KeyRound className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-center text-2xl font-semibold tracking-tight">Choose a new password</h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD} characters.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            required
            minLength={MIN_PASSWORD}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-critical">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? 'Updating…' : 'Set new password'}
        </Button>
      </form>

      <Button asChild variant="ghost" className="mt-4 self-center">
        <Link to="/login"><ArrowLeft className="size-4" /> Back to sign in</Link>
      </Button>
    </div>
  );
}
