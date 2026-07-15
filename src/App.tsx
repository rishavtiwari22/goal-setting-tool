import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import SelfApply from "./pages/SelfApply";
import Interview from "./pages/Interview";

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
