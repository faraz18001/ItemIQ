import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ROLE_META } from '@/data/roles';
import type { Role } from '@/types';

const REGISTER_ROLES: Role[] = ['qbm', 'hod', 'faculty', 'sme', 'student'];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('faculty');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async (attempt: Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      const session = await attempt;
      toast.success(`Account created! Welcome, ${session.name}`);
      navigate(ROLE_META[session.role as Role].home);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your full name.');
    if (!email.trim()) return setError('Enter your institutional email.');
    if (!password) return setError('Enter a password.');
    void go(register(name, email, password, role));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-primary/20">
      <header className="absolute top-0 w-full p-6 sm:p-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Return to prospectus
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-12 flex justify-center">
            <Brand className="scale-125" />
          </div>
          
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Create account
            </h1>
            <p className="mt-3 text-muted-foreground">
              Register for your SIUT workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
              <Input
                id="name"
                placeholder="Dr. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                aria-invalid={!!error}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Institutional ID</Label>
              <Input
                id="email"
                placeholder="name@siut.edu.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!error}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="font-mono"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-muted-foreground">Workspace Role</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {REGISTER_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center justify-center rounded-md border p-2 text-xs font-medium transition-colors ${
                      role === r 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {ROLE_META[r].short}
                  </button>
                ))}
              </div>
            </div>
            
            {error && <p className="text-sm text-critical font-medium">{error}</p>}
            
            <div className="pt-4">
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                Create account <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-foreground hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>

          <p className="mt-12 text-center text-xs text-muted-foreground font-mono uppercase tracking-widest">
            SIUT Examinations · ItemIQ
          </p>
        </motion.div>
      </main>
    </div>
  );
}
