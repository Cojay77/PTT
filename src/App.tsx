import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initDatabase } from './db';
import { hasDemoData, seedDemoData, seedWeeklyReviewsIfEmpty, seedBudgetIfEmpty, seedChangeRequestsIfEmpty } from './data/demoData';
import { useTaskStore } from './store/useTaskStore';
import { useDataStore } from './store/useDataStore';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import ProjectOverview from './pages/ProjectOverview';
import Tasks from './pages/Tasks';
import Backlog from './pages/Backlog';
import Milestones from './pages/Milestones';
import Communications from './pages/Communications';
import Stakeholders from './pages/Stakeholders';
import Resources from './pages/Resources';
import TeamCalendar from './pages/TeamCalendar';
import Risks from './pages/Risks';
import Issues from './pages/Issues';
import Decisions from './pages/Decisions';
import Actions from './pages/Actions';
import Meetings from './pages/Meetings';
import RAID from './pages/RAID';
import Notes from './pages/Notes';
import Reports from './pages/Reports';
import WeeklyReview from './pages/WeeklyReview';
import Timeline from './pages/Timeline';
import Handover from './pages/Handover';
import Settings from './pages/Settings';
import Budget from './pages/Budget';
import ChangeRequests from './pages/ChangeRequests';
import LoadingScreen from './components/ui/LoadingScreen';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTasks = useTaskStore((s) => s.load);
  const loadAll = useDataStore((s) => s.loadAll);

  useEffect(() => {
    initDatabase()
      .then(() => {
        // Seed demo data if empty
        if (!hasDemoData()) {
          seedDemoData();
        }
        seedWeeklyReviewsIfEmpty();
        seedBudgetIfEmpty();
        seedChangeRequestsIfEmpty();
        loadTasks();
        loadAll();
        setDbReady(true);
      })
      .catch((err) => {
        console.error('DB init failed:', err);
        setError(String(err));
      });

    const handleReload = () => {
      loadTasks();
      loadAll();
    };
    window.addEventListener('ptt:data-reloaded', handleReload);
    return () => window.removeEventListener('ptt:data-reloaded', handleReload);
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif', color: '#e55', padding: 32 }}>
        <h2>Failed to initialize database</h2>
        <p style={{ color: '#888', maxWidth: 480, textAlign: 'center' }}>{error}</p>
        <p style={{ color: '#666', fontSize: 13 }}>Make sure you're running the app via <code>npm run dev</code> (not opening index.html directly).</p>
      </div>
    );
  }

  if (!dbReady) return <LoadingScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="overview" element={<ProjectOverview />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="milestones" element={<Milestones />} />
          <Route path="communications" element={<Communications />} />
          <Route path="stakeholders" element={<Stakeholders />} />
          <Route path="resources" element={<Resources />} />
          <Route path="calendar" element={<TeamCalendar />} />
          <Route path="risks" element={<Risks />} />
          <Route path="issues" element={<Issues />} />
          <Route path="decisions" element={<Decisions />} />
          <Route path="actions" element={<Actions />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="raid" element={<RAID />} />
          <Route path="notes" element={<Notes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="weekly-review" element={<WeeklyReview />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="handover" element={<Handover />} />
          <Route path="budget" element={<Budget />} />
          <Route path="change-requests" element={<ChangeRequests />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
