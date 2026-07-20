import { createContext, useContext, useEffect, useState } from "react";
import { ENV } from "../utils/env";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const AuthContext = createContext<any>(null);

function buildUser(data: { id: string; email: string; name?: string }): User {
  return {
    uid: data.id,
    email: data.email,
    displayName: data.name || null,
    photoURL: null, // null → Header falls back to initials from email
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch(`${ENV.AUTH_API_URL()}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(buildUser(data.user));
      } else {
        // Invalid token
        localStorage.removeItem("auth_token");
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user", err);
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetchUser(token).finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  async function signIn(email: string, password: string) {
    const response = await fetch(`${ENV.AUTH_API_URL()}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Login failed");
    }

    const data = await response.json();
    localStorage.setItem("auth_token", data.token);
    setUser(buildUser(data.user));
  }

  async function signUp(email: string, password: string, name?: string) {
    const response = await fetch(`${ENV.AUTH_API_URL()}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Signup failed");
    }

    const data = await response.json();
    localStorage.setItem("auth_token", data.token);
    setUser(buildUser(data.user));
  }

  function signOut() {
    localStorage.removeItem("auth_token");
    setUser(null);
    return Promise.resolve();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
