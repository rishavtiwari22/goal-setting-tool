import { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SelfApply from './pages/SelfApply';
import Interview from './pages/Interview';
import Results from './pages/Results';
import { DEFAULT_PIPER_BACKEND, preparePiperVoice, type TtsBackend } from './lib/piper';
import { PiperLoader } from './components/interview/PiperLoader';

function App() {
  const [preparing, setPreparing] = useState(false);
  const [status, setStatus] = useState<string>('idle');
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
        setPreparing(true);
        handleStatus('Ensuring Piper voice is cached and warmed...');
        try {
          await preparePiperVoice(
            (s) => handleStatus(s),
            backend
          );
          voiceReadyRef.current = true;
          handleStatus('Voice ready & warmed');
        } catch (error) {
          voiceReadyRef.current = false;
          throw error;
        } finally {
          setPreparing(false);
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/selfapply" replace />} />
        <Route path="/selfapply" element={<SelfApply />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/results" element={<Results />} />
      </Routes>
      {preparing && <PiperLoader status={status} />}
    </BrowserRouter>
  );
}

export default App;
