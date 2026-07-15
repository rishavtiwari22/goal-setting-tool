import { useAuth } from "../contexts/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center p-4">Loading...</div>;
  }

  if (user) {
    return <>{children}</>;
  }

  // Not authenticated: show simple login
  return (
    <div className="flex h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome</h1>
        <p className="text-slate-500 mb-6">Please sign in to continue.</p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
