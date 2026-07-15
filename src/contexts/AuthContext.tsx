import { createContext, useContext, useEffect, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut, User } from "firebase/auth";
import { auth, provider } from "../services/firebase";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle any pending redirect result
    getRedirectResult(auth).catch((err) => console.error("Redirect result error:", err));

    // If we are in dev mode, check if we have a mocked user
    if (import.meta.env.DEV) {
      const mockEmail = localStorage.getItem("studentEmail");
      if (mockEmail === "dev@localhost.com") {
        // Set mock user and skip Firebase onAuthStateChanged
        setUser({
          uid: "dev-user-123",
          email: "dev@localhost.com",
          displayName: "Local Developer",
          photoURL: "https://ui-avatars.com/api/?name=Local+Dev&background=random"
        } as User);
        setLoading(false);
        return;
      }
    }

    // This is the single source of truth for auth state (Production)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem("studentEmail", currentUser.email || "");
      } else {
        localStorage.removeItem("studentEmail");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function signIn() {
    if (import.meta.env.DEV) {
      localStorage.setItem("studentEmail", "dev@localhost.com");
      setUser({
        uid: "dev-user-123",
        email: "dev@localhost.com",
        displayName: "Local Developer",
        photoURL: "https://ui-avatars.com/api/?name=Local+Dev&background=random"
      } as User);
      return;
    }
    signInWithRedirect(auth, provider);
  }

  function logOut() {
    localStorage.removeItem("studentEmail");
    if (import.meta.env.DEV && user?.email === "dev@localhost.com") {
      setUser(null);
      return Promise.resolve();
    }
    return signOut(auth);
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
