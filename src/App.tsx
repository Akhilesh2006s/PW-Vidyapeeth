import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { AppShell, LoadingBlock } from './components/ui';
import { LoginPage } from './pages/AuthPages';
import { CounsellorPerformancePage, DashboardPage } from './pages/InsightPages';
import { AdmissionsPage, ParentDetailPage, ParentsPage } from './pages/PeoplePages';
import { NewSessionPage, PointsPage, SessionPage, SessionsPage } from './pages/SessionPages';
import { SettingsPage } from './pages/SettingsPage';

function Private() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingBlock />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export function App() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingBlock />;
  return (
    <Routes>
      <Route path="/login" element={ready && user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route element={<Private />}>
        <Route index element={<DashboardPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="parents" element={<ParentsPage />} />
        <Route path="parents/:id" element={<ParentDetailPage />} />
        <Route path="performance" element={<CounsellorPerformancePage />} />
        <Route path="sessions/new" element={<NewSessionPage />} />
        <Route path="sessions/:id" element={<SessionPage />} />
        <Route path="sessions/:id/:panel" element={<SessionPage />} />
        <Route path="points" element={<PointsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
