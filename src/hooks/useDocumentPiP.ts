import { useState, useCallback } from "react";

const isSupported = true;

export function useDocumentPiP() {
  const [isPiPOpen, setIsPiPOpen] = useState(false);

  const closePiP = useCallback(() => {
    setIsPiPOpen(false);
  }, []);

  const openPiP = useCallback(async () => {
    if (!isSupported) return;
    setIsPiPOpen(true);
  }, []);

  return { isPiPOpen, isSupported, openPiP, closePiP };
}
