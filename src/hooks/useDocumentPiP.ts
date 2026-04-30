import { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { PIP_ANIMATION_CSS } from "../components/interview/InterviewPiP";

/**
 * Document Picture-in-Picture hook.
 *
 * Opens an OS-level always-on-top floating window that hosts an isolated
 * React tree (rendered via `pipRootRef.current.render(...)` from the parent
 * component). The window survives tab switches and other-app focus, which is
 * the whole point — the candidate can keep seeing Zoe while looking at code
 * elsewhere.
 *
 * The companion `Interview.tsx` is responsible for keeping the PiP tree in
 * sync via a mirror-render `useEffect` that calls `pipRootRef.current.render()`
 * whenever the relevant state changes.
 */
const isSupported =
  typeof window !== "undefined" && "documentPictureInPicture" in window;

export function useDocumentPiP() {
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const pipRootRef = useRef<ReactDOM.Root | null>(null);
  const isOpeningRef = useRef(false);
  const cancelledRef = useRef(false);

  const handlePiPClose = useCallback(() => {
    const root = pipRootRef.current;
    pipRootRef.current = null;
    pipWindowRef.current = null;
    setIsPiPOpen(false);
    // Defer unmount to avoid "Cannot unmount while React is rendering" error
    if (root) {
      setTimeout(() => {
        try {
          root.unmount();
        } catch {
          /* already unmounted */
        }
      }, 0);
    }
  }, []);

  const closePiP = useCallback(() => {
    if (isOpeningRef.current) {
      cancelledRef.current = true;
    }
    const root = pipRootRef.current;
    const win = pipWindowRef.current;
    pipRootRef.current = null;
    pipWindowRef.current = null;
    setIsPiPOpen(false);
    // Defer unmount to next microtask to avoid React render cycle conflicts
    if (root) {
      setTimeout(() => {
        try {
          root.unmount();
        } catch {
          /* already unmounted */
        }
      }, 0);
    }
    if (win) {
      setTimeout(() => {
        try {
          win.close();
        } catch {
          /* already closed */
        }
      }, 0);
    }
  }, []);

  const openPiP = useCallback(async () => {
    if (!isSupported || pipWindowRef.current || isOpeningRef.current) return;

    isOpeningRef.current = true;
    cancelledRef.current = false;

    try {
      const pipWin = await (
        window as unknown as {
          documentPictureInPicture: {
            requestWindow: (opts: {
              width: number;
              height: number;
              disallowReturnToOpener?: boolean;
            }) => Promise<Window>;
          };
        }
      ).documentPictureInPicture.requestWindow({
        width: 400,
        height: 260,
        disallowReturnToOpener: false,
      });

      if (cancelledRef.current) {
        pipWin.close();
        isOpeningRef.current = false;
        return;
      }

      // Copy all stylesheets from the main document into the PiP window so
      // Tailwind classes and component styles work inside the floating window.
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules);
          const style = pipWin.document.createElement("style");
          style.textContent = rules.map((r) => r.cssText).join("\n");
          pipWin.document.head.appendChild(style);
        } catch {
          // Cross-origin stylesheet — clone the link element instead
          if (sheet.ownerNode) {
            pipWin.document.head.appendChild(sheet.ownerNode.cloneNode(true));
          }
        }
      }

      // Inject PiP-specific animation CSS (mic ripple, etc.)
      const animStyle = pipWin.document.createElement("style");
      animStyle.textContent = PIP_ANIMATION_CSS;
      pipWin.document.head.appendChild(animStyle);

      // Set dark background on body to match the interview ambience
      pipWin.document.body.style.margin = "0";
      pipWin.document.body.style.padding = "0";
      pipWin.document.body.style.overflow = "hidden";
      pipWin.document.body.style.backgroundColor = "#1a1a2e";

      // Mount point — Interview.tsx renders into this via pipRootRef
      const container = pipWin.document.createElement("div");
      container.id = "pip-root";
      pipWin.document.body.appendChild(container);

      pipRootRef.current = ReactDOM.createRoot(container);
      pipWindowRef.current = pipWin;
      setIsPiPOpen(true);

      pipWin.addEventListener("pagehide", handlePiPClose);
    } catch (err) {
      console.warn("Document PiP failed:", err);
    } finally {
      isOpeningRef.current = false;
    }
  }, [handlePiPClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipRootRef.current) {
        try {
          pipRootRef.current.unmount();
        } catch {
          /* */
        }
      }
      if (pipWindowRef.current) {
        try {
          pipWindowRef.current.close();
        } catch {
          /* */
        }
      }
    };
  }, []);

  return { isPiPOpen, isSupported, openPiP, closePiP, pipRootRef };
}
