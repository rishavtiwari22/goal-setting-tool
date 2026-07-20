import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center p-4">Loading...</div>;
  }

  if (user) {
    return <>{children}</>;
  }

  // Not authenticated: redirect to login
  return <Navigate to="/login" replace />;
}
