import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type State = { status: 'working' } | { status: 'done'; email?: string } | { status: 'failed'; message: string };

/**
 * Confirming an address from an emailed link.
 *
 * Redeems on mount, since there is nothing to ask the user — they have already
 * expressed intent by clicking the link. The ref guards React's development
 * double-invoke: the token is single-use, so firing twice would show a failure
 * on the second call for a verification that had in fact just succeeded.
 */
export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>({ status: 'working' });
  const attempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ status: 'failed', message: 'This link is missing its confirmation token.' });
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    api
      .post<{ ok: boolean; email?: string }>('/auth/verify-email', { token })
      .then((res) => setState({ status: 'done', email: res.email }))
      .catch((err) =>
        setState({
          status: 'failed',
          message: err instanceof Error ? err.message : 'Could not confirm this address.',
        }),
      );
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12 text-center">
      <Brand className="mb-8 self-center" />

      {state.status === 'working' && (
        <>
          <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">Confirming your address…</p>
        </>
      )}

      {state.status === 'done' && (
        <>
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Address confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.email ? (
              <><span className="font-medium text-foreground">{state.email}</span> is confirmed.</>
            ) : (
              'Your email address is confirmed.'
            )}
          </p>
          <Button asChild className="mt-6 self-center"><Link to="/login">Sign in</Link></Button>
        </>
      )}

      {state.status === 'failed' && (
        <>
          <XCircle className="mx-auto size-10 text-critical" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Could not confirm</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirmation links expire. Sign in and request a fresh one from your account.
          </p>
          <Button asChild variant="outline" className="mt-6 self-center">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </>
      )}
    </div>
  );
}
