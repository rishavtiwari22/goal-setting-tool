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
      if (mockEmail === "rishav@navgurukul.org") {
        // Set mock user and skip Firebase onAuthStateChanged
        setUser({
          uid: "dev-user-123",
          email: "rishav@navgurukul.org",
          displayName: "Rishav Tiwari",
          photoURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23646cff'/><text x='50%' y='50%' font-family='Arial' font-size='40' font-weight='bold' fill='white' text-anchor='middle' dy='.3em'>RT</text></svg>"
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
      localStorage.setItem("studentEmail", "rishav@navgurukul.org");
      setUser({
        uid: "dev-user-123",
        email: "rishav@navgurukul.org",
        displayName: "Rishav Tiwari",
        photoURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23646cff'/><text x='50%' y='50%' font-family='Arial' font-size='40' font-weight='bold' fill='white' text-anchor='middle' dy='.3em'>RT</text></svg>"
      } as User);
      return;
    }
    signInWithRedirect(auth, provider);
  }

  function logOut() {
    localStorage.removeItem("studentEmail");
    if (import.meta.env.DEV && user?.email === "rishav@navgurukul.org") {
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
