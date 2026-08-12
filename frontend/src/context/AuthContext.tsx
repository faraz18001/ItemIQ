import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, getToken, setToken } from '@/lib/api';
import type { Role } from '@/types';

export interface Session {
  id: string;
  name: string;
  email: string;
  /** Primary job. Decides the workspace shape and the landing page. */
  role: Role;
  /**
   * Every role held, including operational ones granted on top of `role`
   * through the user_role junction. Gate operator surfaces on this so that
   * holding `admin` adds to somebody's access rather than replacing it.
   */
  roles?: Role[];
  department: string;
  publicId: string;
  /** present only for students */
  studentId?: string;
}

interface AuthCtx {
  session: Session | null;
  /** True until the stored token has been checked against the server. */
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Session>;
  register: (name: string, email: string, password: string, role?: string) => Promise<Session>;
  loginAs: (role: Role) => Promise<Session>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

/**
 * Seeded accounts, all sharing the demo password, behind the quick-login cards.
 * These exist in the database — the server still verifies the password.
 */
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'itemiq';

export const ROLE_SAMPLE: Record<Role, string> = {
  qbm: 'ashar.minai@siut.edu.pk',
  hod: 'shagufta.yamin@siut.edu.pk',
  faculty: 'bilal.hussain@siut.edu.pk',
  sme: 'kamran.sheikh@siut.edu.pk',
  examiner: 'nadia.farooq@siut.edu.pk',
  student: 'm22-1042',
  // The bootstrap account, which holds admin alongside qbm. Not a persona like
  // the others — it is the only way into the diagnostics surface on a fresh
  // install, before anyone has been granted the role.
  admin: 'admin@itemiq.test',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // A token in localStorage is only a claim; the server decides whether it is
  // still valid, so every page load re-verifies before showing the app.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get<Session>('/auth/me')
      .then((me) => {
        if (!cancelled) setSession(me);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.isAuthError) setToken(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const authenticate = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<{ token: string; user: Session }>('/auth/login', {
      identifier,
      password,
    });
    setToken(res.token);
    setSession(res.user);
    return res.user;
  }, []);

  const registerUser = useCallback(async (name: string, email: string, password: string, role?: string) => {
    const res = await api.post<{ token: string; user: Session }>('/auth/register', {
      name,
      email,
      password,
      role: role || 'faculty',
    });
    setToken(res.token);
    setSession(res.user);
    return res.user;
  }, []);

  const loginAs = useCallback(
    (role: Role) => authenticate(ROLE_SAMPLE[role], DEMO_PASSWORD),
    [authenticate],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Signing out must always succeed locally, even if the server is down.
    }
    setToken(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ session, loading, login: authenticate, register: registerUser, loginAs, logout }),
    [session, loading, authenticate, registerUser, loginAs, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
