/**
 * Which Zuvy environment the user was redirected into Zoe from.
 *
 * Zuvy (both dev and prod) opens Zoe via
 *   window.open("https://zoe.zuvy.org?token=<jwt>", "_blank")
 * with NO source/env param and a token whose payload carries no environment
 * field — so the only signal available on our single host is the referrer.
 * Zuvy sets no referrer-policy, so the browser default
 * (strict-origin-when-cross-origin) hands us the origin:
 *   - https://dev.app.zuvy.org  → Zuvy dev/staging
 *   - https://app.zuvy.org      → Zuvy prod
 * and there's no `noreferrer` on the window.open, so it survives the new tab.
 *
 * `document.referrer` is only reliable on the landing document (it would be lost
 * on a hard reload), so we capture it ONCE at startup and persist it for the
 * rest of the session. No Zuvy-side change is required.
 */

const KEY = "zuvySource";

// Hosts that mean "Zuvy dev/staging". Everything else — app.zuvy.org, a direct
// visit, or a stripped referrer — is treated as prod.
const DEV_REFERRER_HOSTS = ["dev.app.zuvy.org"];

// The dev Resume Buddy build. Overridable via env; hardcoded fallback so it
// works without an env change on the deployment.
const DEV_RESUME_BUDDY_URL_FALLBACK =
  "https://resume-builder.d3s88q50fgekpa.amplifyapp.com";

export type ZuvySource = "dev" | "prod";

/** Read + persist the source from the landing referrer. Call once at startup. */
export function captureZuvySource(): void {
  try {
    if (sessionStorage.getItem(KEY)) return; // already captured this session
    const ref = document.referrer;
    if (!ref) return;
    const host = new URL(ref).host.toLowerCase();
    if (DEV_REFERRER_HOSTS.includes(host)) {
      sessionStorage.setItem(KEY, "dev");
    } else if (host === "app.zuvy.org") {
      sessionStorage.setItem(KEY, "prod");
    }
    // Unknown referrers: leave unset → getZuvySource() defaults to prod.
  } catch {
    /* referrer parse / storage errors are non-fatal — default to prod */
  }
}

export function getZuvySource(): ZuvySource {
  try {
    return sessionStorage.getItem(KEY) === "dev" ? "dev" : "prod";
  } catch {
    return "prod";
  }
}

/**
 * Resume Buddy builder URL for the current source: dev Zuvy users get the dev
 * builder; everyone else gets the prod builder (VITE_RESUME_BUDDY_URL).
 */
export function getResumeBuddyUrl(): string {
  const prod = import.meta.env.VITE_RESUME_BUDDY_URL;
  const dev =
    import.meta.env.VITE_RESUME_BUDDY_URL_DEV || DEV_RESUME_BUDDY_URL_FALLBACK;
  return getZuvySource() === "dev" ? dev : prod;
}
