import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import SelfApply from "./pages/SelfApply";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserList from "./pages/AdminUserList";
import AdminRecruitment from "./pages/AdminRecruitment";
import AdminJobs from "./pages/AdminJobs";
import { AdminAuthGuard } from "./components/AdminAuthGuard";
import { usePageTracking } from "./hooks/usePageTracking";
import { AuthGuard } from "./components/AuthGuard";
import { cleanupSyncedSessions } from "./services/storage/interviewStorage";
import CalendarPage from "./pages/CalendarPage";
import { AuthProvider } from "./contexts/AuthContext";

function AppContent() {
  usePageTracking();

  useEffect(() => {
    cleanupSyncedSessions();
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthGuard>
            <Home />
          </AuthGuard>
        }
      />
      <Route
        path="/calendar/:date?"
        element={
          <AuthGuard>
            <CalendarPage />
          </AuthGuard>
        }
      />
      <Route
        path="/selfapply"
        element={
          <AuthGuard>
            <SelfApply />
          </AuthGuard>
        }
      />
      <Route
        path="/interview/:sessionId?"
        element={
          <AuthGuard>
            <Interview />
          </AuthGuard>
        }
      />
      <Route
        path="/results/:sessionId?"
        element={
          <AuthGuard>
            <Results />
          </AuthGuard>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminAuthGuard>
            <AdminDashboard />
          </AdminAuthGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminAuthGuard>
            <AdminUserList />
          </AdminAuthGuard>
        }
      />
      <Route
        path="/admin/recruitment"
        element={
          <AdminAuthGuard>
            <AdminRecruitment />
          </AdminAuthGuard>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <AdminAuthGuard>
            <AdminJobs />
          </AdminAuthGuard>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
