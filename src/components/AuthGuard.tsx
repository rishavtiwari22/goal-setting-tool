import { useLocation, useSearchParams } from "react-router-dom";
import { isTokenValid, getEmailFromJWT, isValidJWTFormat } from "../utils/jwt";

export function AuthGuard({ children }: { children: React.ReactNode }) {
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
  const emailInStorage = localStorage.getItem("studentEmail");

  // Allow through if: token in URL, valid token in storage, OR email in storage (bypass mode)
  if (tokenInQuery || isTokenValid(tokenInStorage) || emailInStorage) {
    return <>{children}</>;
  }

  // No auth at all — still render children (Home will show email input)
  return <>{children}</>;
}

