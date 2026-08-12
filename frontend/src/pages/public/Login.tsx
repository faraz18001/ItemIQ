import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, GraduationCap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { ROLE_META } from '@/data/roles';
import type { Role } from '@/types';

const QUICK: Role[] = ['qbm', 'hod', 'faculty', 'sme', 'student'];

export function Login() {
  const { login, loginAs } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Credentials are verified by the server; a failure here is a real auth
  // failure, not a missing entry in a local array.
  const go = async (attempt: Promise<{ role: Role; name: string }>) => {
    setBusy(true);
    setError('');
    try {
      const session = await attempt;
      toast.success(`Signed in as ${session.name}`);
      navigate(ROLE_META[session.role].home);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) return setError('Enter your institutional email or student ID.');
    if (!password) return setError('Enter your password.');
    void go(login(identifier, password));
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-700 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="relative"><Brand className="[&_*]:text-white" /></Link>
        <div className="relative space-y-6">
          <p className="issue-label text-white/70">SIUT · Examinations</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Every question, measured. Not guessed.
          </h1>
          <p className="max-w-md leading-relaxed text-white/80">
            ItemIQ blends faculty judgement, AI text analysis, and real student response
            data into one defensible difficulty tag for the SIUT question bank.
          </p>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <ShieldCheck className="size-5" /> Role-based access across the authoring &amp; review lifecycle.
          </div>
        </div>
        <p className="relative issue-label text-white/60">
          Sindh Institute of Urology &amp; Transplantation · Examinations
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-sm"
        >
          <div className="mb-6 lg:hidden"><Brand /></div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seeded demo accounts use the password{' '}
            <span className="font-medium text-foreground">itemiq</span>, or pick a role below to sign in directly.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or student ID</Label>
              <Input
                id="identifier"
                placeholder="name@siut.edu.pk"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="itemiq"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-critical">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              Sign in <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or jump straight in as <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((role) => (
              <Card
                key={role}
                onClick={() => void go(loginAs(role))}
                className="cursor-pointer flex-row items-center gap-2.5 p-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold"
                  style={{ background: `color-mix(in oklab, ${ROLE_META[role].color}, transparent 82%)`, color: ROLE_META[role].color }}
                >
                  {role === 'student' ? <GraduationCap className="size-4" /> : ROLE_META[role].short.slice(0, 3)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{ROLE_META[role].short}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{ROLE_META[role].label}</span>
                </span>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
