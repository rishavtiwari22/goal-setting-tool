import { createContext, useContext, useEffect, useState } from "react";
import { ENV } from "../utils/env";
import { getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut, User } from "firebase/auth";
import { auth, provider } from "../services/firebase";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Force dummy user
    setUser({
      uid: "dummy-user-123",
      email: ENV.DUMMY_EMAIL(),
      displayName: "Dummy User",
      photoURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23646cff'/><text x='50%' y='50%' font-family='Arial' font-size='40' font-weight='bold' fill='white' text-anchor='middle' dy='.3em'>DU</text></svg>"
    } as User);
    setLoading(false);
  }, []);

  function signIn() {
    // No-op
  }

  function logOut() {
    return Promise.resolve();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
