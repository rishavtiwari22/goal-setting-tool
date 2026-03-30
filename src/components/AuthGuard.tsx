import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { isTokenValid, getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const tokenInQuery = searchParams.get("token") || searchParams.get("jwt");

  // Persist token to localStorage synchronously so all child components
  // (and their useEffects) see it immediately on first render
  if (tokenInQuery && isValidJWTFormat(tokenInQuery)) {
    const email = getEmailFromJWT(tokenInQuery);
    if (email) {
      localStorage.setItem("studentToken", tokenInQuery);
      localStorage.setItem("studentEmail", email);
    }
  }

  const tokenInStorage = localStorage.getItem("studentToken");

  useEffect(() => {
    if (!tokenInQuery && !isTokenValid(tokenInStorage)) {
      const currentUrl = window.location.origin + location.pathname + location.search;
      const zoeRedirectUrl = `zoe.zuvy.org?returnUrl=${encodeURIComponent(currentUrl)}`;
      const redirectUrl = `https://app.zuvy.org?zoeRedirectUrl=${encodeURIComponent(zoeRedirectUrl)}`;

      localStorage.removeItem("studentToken");
      localStorage.removeItem("studentEmail");

      window.location.href = redirectUrl;
    }
  }, [location, searchParams]);

  if (tokenInQuery) {
    return <>{children}</>;
  }

  if (!isTokenValid(tokenInStorage)) {
    return null;
  }

  return <>{children}</>;
}

