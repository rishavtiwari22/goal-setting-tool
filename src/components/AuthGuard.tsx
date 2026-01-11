import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { isTokenValid } from "../utils/jwt";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenInQuery = searchParams.get("token") || searchParams.get("jwt");
    const invitationToken = searchParams.get("token");
    const tokenInStorage = localStorage.getItem("studentToken");
    
    if (tokenInQuery || invitationToken) {
      return;
    }
    
    if (!isTokenValid(tokenInStorage)) {
      const currentUrl = window.location.origin + location.pathname + location.search;
      const zoeRedirectUrl = `zoe.zuvy.org?returnUrl=${encodeURIComponent(currentUrl)}`;
      const redirectUrl = `https://app.zuvy.org?zoeRedirectUrl=${encodeURIComponent(zoeRedirectUrl)}`;
      
      localStorage.removeItem("studentToken");
      localStorage.removeItem("studentEmail");
      
      window.location.href = redirectUrl;
    }
  }, [location, searchParams]);

  const tokenInQuery = searchParams.get("token") || searchParams.get("jwt");
  const invitationToken = searchParams.get("token");
  const tokenInStorage = localStorage.getItem("studentToken");
  
  if (tokenInQuery || invitationToken) {
    return <>{children}</>;
  }
  
  if (!isTokenValid(tokenInStorage)) {
    return null;
  }

  return <>{children}</>;
}

