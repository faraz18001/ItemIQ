import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

/**
 * Asking for a reset link.
 *
 * The confirmation is shown for any address, including ones with no account.
 * That is not vagueness for its own sake — telling somebody "no account with
 * that email" turns this form into a way to test who works here. The server
 * answers identically for the same reason; this screen just does not undo it.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      // Only a transport or server failure reaches here — a missing account is
      // a success as far as this endpoint is concerned.
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <Brand className="mb-8 self-center" />

      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto size-10 text-success" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If <span className="font-medium text-foreground">{email}</span> has an ItemIQ
            account, a link to choose a new password is on its way. It works once and
            expires within the hour.
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing arrived? Check spam, or ask a Question Bank Manager to reset it for you.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/login"><ArrowLeft className="size-4" /> Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the address on your account and we will send a link to set a new password.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="name@siut.edu.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {error && <p className="text-sm text-critical">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>

          <Button asChild variant="ghost" className="mt-4 self-center">
            <Link to="/login"><ArrowLeft className="size-4" /> Back to sign in</Link>
          </Button>
        </>
      )}
    </div>
  );
}
