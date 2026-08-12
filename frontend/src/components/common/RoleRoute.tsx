import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/common/PageLoader';
import { ROLE_META } from '@/data/roles';
import type { Role } from '@/types';

/**
 * Guards the authenticated area; optionally restricts to specific roles.
 *
 * This is a convenience only — the API enforces the same rules server-side, so
 * a user who reaches a route another way still cannot act outside their role.
 */
/**
 * Every role the session holds.
 *
 * `role` is the person's primary job; `roles` adds anything granted on top
 * through the user_role junction. Checking the union is what lets an
 * operational role like `admin` be handed to somebody without displacing the
 * academic role their whole workspace is built around.
 */
function heldRoles(session: { role: Role; roles?: Role[] }): Role[] {
  return Array.from(new Set<Role>([session.role, ...(session.roles ?? [])]));
}

function permitted(session: { role: Role; roles?: Role[] }, roles: Role[]): boolean {
  const held = heldRoles(session);
  return roles.some((r) => held.includes(r));
}

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Wait for the stored token to be verified before deciding, otherwise a
  // refresh on any in-app URL would bounce to the login page.
  if (loading) return <PageLoader />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !permitted(session, roles)) {
    return <Navigate to={ROLE_META[session.role].home} replace />;
  }
  return <>{children}</>;
}

/**
 * Restricts a route to specific roles, sending anyone else to their own home.
 *
 * Used inside the authenticated area, where RequireAuth has already run — so
 * this only needs to check the role, not the session.
 */
export function RoleRoute({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const { session } = useAuth();
  if (!session) return null;
  if (!permitted(session, roles)) {
    return <Navigate to={ROLE_META[session.role].home} replace />;
  }
  return <>{children}</>;
}
