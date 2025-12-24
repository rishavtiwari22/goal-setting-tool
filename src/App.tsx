import { useEffect, useState, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import SelfApply from "./pages/SelfApply";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import {
  DEFAULT_PIPER_BACKEND,
  preparePiperVoice,
  type TtsBackend,
} from "./lib/piper";
import { usePageTracking } from "./hooks/usePageTracking";
import { AuthGuard } from "./components/AuthGuard";

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
        path="/results"
        element={
          <AuthGuard>
            <Results />
          </AuthGuard>
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
