/** Role metadata and navigation, shared across the app shell. */

import type { Role } from '@/types';

export interface RoleMeta { label: string; short: string; home: string; color: string }

export const ROLE_META: Record<Role, RoleMeta> = {
  qbm: { label: 'Question Bank Manager', short: 'QBM', home: '/app/manage', color: 'var(--series-5)' },
  hod: { label: 'Head of Department', short: 'HOD', home: '/app/department', color: 'var(--series-1)' },
  faculty: { label: 'Faculty Member', short: 'Faculty', home: '/app/faculty', color: 'var(--series-2)' },
  sme: { label: 'Subject Matter Expert', short: 'SME', home: '/app/review', color: 'var(--series-8)' },
  // Examiner role is handled by the exam department outside this system (per SIUT questionnaire).
  // Kept in the type system for data compatibility but hidden from navigation.
  examiner: { label: 'Examiner', short: 'Examiner', home: '/app/bank', color: 'var(--series-3)' },
  student: { label: 'Student', short: 'Student', home: '/app/practice', color: 'var(--series-1)' },
  // Operational rather than academic. Granted on top of a real role through the
  // user_role junction, so it has no workspace of its own — anyone holding it
  // also holds the role whose home they land on. The entry exists because
  // ROLE_META is exhaustive over Role and `admin` is a valid primary value for
  // the bootstrap account.
  admin: { label: 'System Administrator', short: 'Admin', home: '/app/diagnostics', color: 'var(--series-4)' },
};

export type Tone = 'neutral' | 'brand' | 'warning' | 'serious' | 'good' | 'critical';

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'brand' },
  under_departmental_review: { label: 'SME Review', tone: 'warning' },
  correction_required: { label: 'Correction Required', tone: 'serious' },
  accepted_departmental: { label: 'SME Accepted', tone: 'brand' },
  under_med_edu_review: { label: 'Final Review', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'good' },
  in_bank: { label: 'In Bank', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'critical' },
  retired: { label: 'Retired', tone: 'neutral' },
};

export const REQUEST_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  Generated: { label: 'Generated', tone: 'neutral' },
  Assigned: { label: 'Assigned', tone: 'brand' },
  In_Progress: { label: 'In Progress', tone: 'warning' },
  Completed: { label: 'Completed', tone: 'good' },
};

export interface NavItem { to: string; label: string; icon: string; end?: boolean }

/**
 * Sidebar navigation for a session.
 *
 * `role` is the person's primary job and decides the shape of the workspace.
 * `held` is everything they hold, which is how operational entries appear
 * without belonging to any one academic role — an admin who is also a QBM gets
 * the QBM workspace plus Diagnostics, rather than a separate stripped-down one.
 */
export function navForSession(role: Role, held: Role[] = []): NavItem[] {
  const items = navForRole(role);
  const all = new Set<Role>([role, ...held]);
  if (all.has('admin')) {
    // Accounts is already in the QBM sidebar, so only add it for an admin who
    // is not one — otherwise a faculty member granted admin could reach the
    // screen by URL but have no way to navigate to it.
    if (!items.some((i) => i.to === '/app/users')) {
      items.push({ to: '/app/users', label: 'Accounts', icon: 'users' });
    }
    items.push({ to: '/app/diagnostics', label: 'Diagnostics', icon: 'activity' });
  }
  return items;
}

/** Sidebar navigation per role. */
export function navForRole(role: Role): NavItem[] {
  switch (role) {
    case 'student':
      return [
        { to: '/app/practice', label: 'Practice', icon: 'book' },
        { to: '/app/mock', label: 'Mock Exams', icon: 'clipboard' },
        { to: '/app/progress', label: 'Progress', icon: 'chartUp' },
      ];
    case 'faculty':
      return [
        { to: '/app/faculty', label: 'My Dashboard', icon: 'home', end: true },
        { to: '/app/faculty/new', label: 'Add Question', icon: 'filePlus' },
        { to: '/app/faculty/worksheet', label: 'Worksheet Builder', icon: 'file' },
        { to: '/app/bank', label: 'Question Bank', icon: 'layers' },
        { to: '/app/notifications', label: 'Notifications', icon: 'bell' },
      ];
    case 'sme':
      return [
        { to: '/app/review', label: 'Review Queue', icon: 'checkCircle' },
        { to: '/app/bank', label: 'Question Bank', icon: 'layers' },
        { to: '/app/notifications', label: 'Notifications', icon: 'bell' },
      ];
    case 'qbm':
      return [
        { to: '/app/manage', label: 'Requests', icon: 'clipboard', end: true },
        { to: '/app/manage/review', label: 'Final Review', icon: 'award' },
        { to: '/app/department', label: 'Department', icon: 'users' },
        { to: '/app/bank', label: 'Question Bank', icon: 'layers' },
        { to: '/app/analytics', label: 'Item Analytics', icon: 'chart' },
        { to: '/app/users', label: 'Accounts', icon: 'users' },
      ];
    case 'hod':
      return [
        { to: '/app/department', label: 'Department', icon: 'users' },
        { to: '/app/manage', label: 'Requests', icon: 'clipboard' },
        { to: '/app/bank', label: 'Question Bank', icon: 'layers' },
        { to: '/app/analytics', label: 'Item Analytics', icon: 'chart' },
      ];
    case 'examiner':
      // Examiner is handled outside this system; show minimal nav if someone
      // somehow signs in with this role.
      return [
        { to: '/app/bank', label: 'Question Bank', icon: 'layers' },
      ];
    default:
      return [];
  }
}
