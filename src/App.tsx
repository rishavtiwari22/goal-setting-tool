import { useEffect, useState, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import SelfApply from "./pages/SelfApply";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import DataPolicy from "./pages/DataPolicy";
import InvitedInterview from "./pages/InvitedInterview";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserList from "./pages/AdminUserList";
import AdminRecruitment from "./pages/AdminRecruitment";
import AdminJobs from "./pages/AdminJobs";
import { AdminAuthGuard } from "./components/AdminAuthGuard";
import {
  DEFAULT_PIPER_BACKEND,
  preparePiperVoice,
  type TtsBackend,
} from "./lib/piper";
import { usePageTracking } from "./hooks/usePageTracking";
import { AuthGuard } from "./components/AuthGuard";
import { cleanupSyncedSessions } from "./services/storage/interviewStorage";

function AppContent() {
  usePageTracking();
  const [status, setStatus] = useState<string>("idle");
  const preparePromiseRef = useRef<Promise<void> | null>(null);
  const voiceReadyRef = useRef(false);

  const handleStatus = useCallback((s: string) => {
    setStatus(s);
  }, []);

  const ensureVoiceReady = useCallback(
    async (backend: TtsBackend = DEFAULT_PIPER_BACKEND, force = false) => {
      if (voiceReadyRef.current && !force) return;

      if (preparePromiseRef.current) {
        return preparePromiseRef.current;
      }

      if (force) {
        voiceReadyRef.current = false;
      }

      const preparation = (async () => {
        handleStatus("Ensuring Piper voice is cached and warmed...");
        try {
          await preparePiperVoice((s) => handleStatus(s), backend);
          voiceReadyRef.current = true;
          handleStatus("Voice ready & warmed");
        } catch (error) {
          voiceReadyRef.current = false;
          throw error;
        }
      })();

      preparePromiseRef.current = preparation;

      try {
        await preparation;
      } finally {
        preparePromiseRef.current = null;
      }
    },
    [handleStatus]
  );

  useEffect(() => {
    ensureVoiceReady(DEFAULT_PIPER_BACKEND).catch((error: any) => {
      handleStatus(`Initial Piper prepare failed: ${String(error)}`);
    });

    cleanupSyncedSessions();
  }, [ensureVoiceReady, handleStatus]);

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
        path="/data-policy"
        element={<DataPolicy />}
      />
      <Route
        path="/interview/invited"
        element={<InvitedInterview />}
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
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
