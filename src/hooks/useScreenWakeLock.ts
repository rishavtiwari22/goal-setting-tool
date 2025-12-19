import { useEffect, useRef } from "react";

export function useScreenWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        if (!enabled) return;
        if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
          return;
        }

        const sentinel = await (navigator as any).wakeLock.request("screen");

        if (cancelled) {
          try {
            await sentinel.release();
          } catch {
          }
          return;
        }

        wakeLockRef.current = sentinel;

        sentinel.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.error("Screen Wake Lock request failed:", err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (wakeLockRef.current) {
        wakeLockRef.current
          .release()
          .catch(() => {
          })
          .finally(() => {
            wakeLockRef.current = null;
          });
      }
    };
  }, [enabled]);
}
