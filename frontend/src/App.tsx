import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, RoleRoute } from '@/components/common/RoleRoute';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { ROLE_META } from '@/data/roles';

import { Home } from '@/pages/public/Home';
import { Features } from '@/pages/public/Features';
import { About } from '@/pages/public/About';
import { Login } from '@/pages/public/Login';
import { ForgotPassword } from '@/pages/public/ForgotPassword';
import { ResetPassword } from '@/pages/public/ResetPassword';
import { VerifyEmail } from '@/pages/public/VerifyEmail';
import { NotFound } from '@/pages/public/NotFound';

// Authenticated pages are code-split so the marketing site and each workspace
// only load what they need.
const Bank = lazy(() => import('@/pages/app/shared/Bank').then((m) => ({ default: m.Bank })));
const Analytics = lazy(() => import('@/pages/app/shared/Analytics').then((m) => ({ default: m.Analytics })));
const ItemAnalysis = lazy(() => import('@/pages/app/shared/ItemAnalysis').then((m) => ({ default: m.ItemAnalysis })));
const Notifications = lazy(() => import('@/pages/app/shared/Notifications').then((m) => ({ default: m.Notifications })));
const FacultyDashboard = lazy(() => import('@/pages/app/faculty/FacultyDashboard').then((m) => ({ default: m.FacultyDashboard })));
const AddQuestion = lazy(() => import('@/pages/app/faculty/AddQuestion').then((m) => ({ default: m.AddQuestion })));
const WorksheetBuilder = lazy(() => import('@/pages/app/faculty/WorksheetBuilder').then((m) => ({ default: m.WorksheetBuilder })));
const Requests = lazy(() => import('@/pages/app/workflow/Requests').then((m) => ({ default: m.Requests })));
const Department = lazy(() => import('@/pages/app/workflow/Department').then((m) => ({ default: m.Department })));
const FacultyDetail = lazy(() => import('@/pages/app/workflow/FacultyDetail').then((m) => ({ default: m.FacultyDetail })));
const ReviewQueue = lazy(() => import('@/pages/app/workflow/ReviewQueue').then((m) => ({ default: m.ReviewQueue })));
const PaperBuilder = lazy(() => import('@/pages/app/workflow/PaperBuilder').then((m) => ({ default: m.PaperBuilder })));
const PaperDetail = lazy(() => import('@/pages/app/workflow/PaperDetail').then((m) => ({ default: m.PaperDetail })));
const NewAdmissionTest = lazy(() => import('@/pages/app/workflow/NewAdmissionTest').then((m) => ({ default: m.NewAdmissionTest })));
const Practice = lazy(() => import('@/pages/app/student/Practice').then((m) => ({ default: m.Practice })));
const Mock = lazy(() => import('@/pages/app/student/Mock').then((m) => ({ default: m.Mock })));
const Progress = lazy(() => import('@/pages/app/student/Progress').then((m) => ({ default: m.Progress })));
const Users = lazy(() => import('@/pages/app/admin/Users').then((m) => ({ default: m.Users })));
const Diagnostics = lazy(() => import('@/pages/app/admin/Diagnostics').then((m) => ({ default: m.Diagnostics })));

function AppIndex() {
  const { session } = useAuth();
  return <Navigate to={session ? ROLE_META[session.role].home : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
      </Route>
      <Route path="/login" element={<Login />} />
      {/* Reached from an emailed link, so unauthenticated by definition. */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AppIndex />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="practice" element={<Practice />} />
                <Route path="mock" element={<Mock />} />
                <Route path="progress" element={<Progress />} />

                <Route path="faculty" element={<FacultyDashboard />} />
                <Route path="faculty/new" element={<AddQuestion />} />
                <Route path="faculty/edit/:id" element={<AddQuestion />} />
                <Route path="faculty/worksheet" element={<WorksheetBuilder />} />

                <Route path="review" element={<ReviewQueue stage="departmental" />} />

                <Route path="manage" element={<Requests />} />
                <Route path="manage/review" element={<ReviewQueue stage="med_edu" />} />
                {/* QBM runs the staff directory; admin grants and revokes the
                    operational role. Both need the screen, and the controls
                    inside it differ by what the viewer holds. */}
                <Route path="users" element={<RoleRoute roles={['qbm', 'admin']}><Users /></RoleRoute>} />
                {/* Operational, not academic: the report names tables, row ids
                    and which configuration is set, so it hangs off `admin`
                    rather than being bundled into an examinations role. */}
                <Route path="diagnostics" element={<RoleRoute roles={['admin']}><Diagnostics /></RoleRoute>} />

                {/* Nav-gated for everyone else, but the API's visible_to() already
                    permits qbm/hod to see any faculty's authored work, so the route
                    itself is guarded rather than relying on nav visibility alone. */}
                <Route path="department" element={<RoleRoute roles={['hod', 'qbm']}><Department /></RoleRoute>} />
                <Route path="department/:facultyId" element={<RoleRoute roles={['hod', 'qbm']}><FacultyDetail /></RoleRoute>} />
                <Route path="examiner" element={<PaperBuilder />} />
                <Route path="examiner/new" element={<RoleRoute roles={['examiner', 'qbm']}><NewAdmissionTest /></RoleRoute>} />
                <Route path="examiner/papers/:paperId" element={<PaperDetail />} />

                <Route path="bank" element={<Bank />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="item-analysis" element={<ItemAnalysis />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
