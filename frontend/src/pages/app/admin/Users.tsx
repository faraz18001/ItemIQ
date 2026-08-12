import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2, ShieldCheck, UserPlus, Users as UsersIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ROLE_META } from '@/data/roles';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Role, User } from '@/types';

/**
 * Account provisioning and role assignment.
 *
 * Two audiences with different powers. A QBM runs the staff directory —
 * creating accounts, changing somebody's job title, deactivating them. An
 * admin additionally grants and revokes the operational `admin` role, which is
 * deliberately not a QBM power: whoever can grant admin controls the system, so
 * a question bank manager who could grant it could grant it to themselves.
 *
 * There is no public sign-up: a role here carries real authority, so letting
 * someone pick their own at registration would let anyone approve exam content.
 * Students are absent by design — the ERD sources them from SIUT's student
 * management system, so they arrive by roster import rather than one at a time.
 */

const STAFF_ROLES: Role[] = ['qbm', 'hod', 'faculty', 'sme', 'examiner'];
const MIN_PASSWORD = 8;

export function Users() {
  const { session } = useAuth();
  // Mirrors security.roles_of(): the primary role plus every active grant.
  const canGrant = session
    ? [session.role, ...(session.roles ?? [])].includes('admin')
    : false;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.get<User[]>('/users?include_inactive=true'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = useMemo(() => users.filter((u) => u.isActive !== false), [users]);

  const setActive = async (user: User, isActive: boolean) => {
    // Optimistic: the switch should not lag behind the click.
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, isActive } : u)));
    try {
      await api.patch(`/users/${user.id}`, { isActive });
      toast.success(`${user.name} ${isActive ? 'reactivated' : 'deactivated'}.`);
    } catch (err) {
      setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, isActive: !isActive } : u)));
      toast.error(err instanceof Error ? err.message : 'Could not update the account.');
    }
  };

  const setRole = async (user: User, role: Role) => {
    const previous = user.role;
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, role } : u)));
    try {
      await api.patch(`/users/${user.id}`, { role });
      toast.success(`${user.name} is now ${ROLE_META[role].label}.`);
    } catch (err) {
      setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, role: previous } : u)));
      toast.error(err instanceof Error ? err.message : 'Could not change the role.');
    }
  };

  /**
   * Grant or revoke the operational admin role.
   *
   * Not optimistic, unlike the switches above: the server refuses to revoke the
   * last remaining admin, and showing the toggle flip before that check would
   * be showing a change that is about to be rejected.
   */
  const setAdmin = async (user: User, grant: boolean) => {
    try {
      const updated = grant
        ? await api.post<User>(`/users/${user.id}/roles`, { role: 'admin' })
        : await api.del<User>(`/users/${user.id}/roles/admin`);
      setUsers((us) => us.map((u) => (u.id === user.id ? updated : u)));
      toast.success(`${user.name} ${grant ? 'now has' : 'no longer has'} admin access.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change admin access.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader help="accounts"
        title="Accounts"
        description="Provision staff accounts and manage access. Students are imported from SIUT's student records, not created here."
      >
        <CreateUserDialog onCreated={load} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Active accounts" value={active.length} icon={UsersIcon} accent="var(--series-1)" />
        <StatTile label="Deactivated" value={users.length - active.length} accent="var(--series-6)" />
        <StatTile
          label="Administrators"
          value={active.filter((u) => u.role === 'qbm').length}
          icon={ShieldCheck}
          accent="var(--series-5)"
          hint="Question Bank Managers"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-critical/40 bg-critical/8 p-4 text-sm">{error}</div>
      )}

      <Card className="gap-0 overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading accounts…
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No staff accounts" description="Add one to get started." className="m-4" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canGrant && <TableHead>Admin</TableHead>}
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === session?.id;
                const inactive = u.isActive === false;
                return (
                  <TableRow key={u.id} className={cn(inactive && 'opacity-55')}>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {u.name}
                        {isSelf && <Badge variant="neutral" className="ml-2">You</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{u.publicId}</TableCell>
                    <TableCell className="text-sm">{u.department || 'N/A'}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isSelf}
                        onValueChange={(v) => void setRole(u, v as Role)}
                      >
                        <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.joiningDate ? formatDate(u.joiningDate) : 'N/A'}
                    </TableCell>
                    {canGrant && (
                      <TableCell>
                        <Switch
                          checked={(u.roles ?? []).includes('admin')}
                          onCheckedChange={(v) => void setAdmin(u, v)}
                          aria-label={`Admin access for ${u.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Switch
                        checked={!inactive}
                        disabled={isSelf}
                        onCheckedChange={(v) => void setActive(u, v)}
                        aria-label={`${inactive ? 'Reactivate' : 'Deactivate'} ${u.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ResetPasswordDialog user={u} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        You cannot change your own role or deactivate your own account, and the last active
        Question Bank Manager cannot be removed. The system must always have an administrator.
      </p>
    </div>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', department: '', role: 'faculty' as Role, password: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (form.password.length < MIN_PASSWORD) {
      return setError(`The temporary password must be at least ${MIN_PASSWORD} characters.`);
    }
    setBusy(true);
    try {
      await api.post('/users', form);
      await onCreated();
      toast.success(`Account created for ${form.name}. Share the temporary password with them.`);
      setOpen(false);
      setForm({ name: '', email: '', department: '', role: 'faculty', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(''); }}>
      <DialogTrigger asChild>
        <Button><UserPlus className="size-4" /> Add account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a staff account</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-name">Full name</Label>
            <Input id="u-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Dr. Sara Ahmed" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">Institutional email</Label>
            <Input id="u-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="sara.ahmed@siut.edu.pk" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="u-dept">Department</Label>
              <Input id="u-dept" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Physiology" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => set('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pw">Temporary password</Label>
            <Input id="u-pw" type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={`At least ${MIN_PASSWORD} characters`} />
            <p className="text-xs text-muted-foreground">
              Shown in plain text so you can pass it on. They can change it from their account menu.
            </p>
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={busy || !form.name || !form.email}>
            {busy && <Loader2 className="size-4 animate-spin" />} Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (password.length < MIN_PASSWORD) {
      return setError(`The password must be at least ${MIN_PASSWORD} characters.`);
    }
    setBusy(true);
    try {
      await api.post(`/users/${user.id}/reset-password`, { newPassword: password });
      toast.success(`Password reset for ${user.name}.`);
      setOpen(false);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(''); setPassword(''); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Reset password for ${user.name}`}>
          <KeyRound className="size-4" /> Reset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset password: {user.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reset-pw">New temporary password</Label>
          <Input id="reset-pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${MIN_PASSWORD} characters`} />
          <p className="text-xs text-muted-foreground">
            Use this when someone is locked out. Any session they already have stays valid until it expires.
          </p>
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
