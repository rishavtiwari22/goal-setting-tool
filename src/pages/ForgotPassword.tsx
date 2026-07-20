import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ENV } from "../utils/env";
import { toast } from "sonner";
import { BrainCircuit, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const authBase = ENV.AUTH_API_URL();
      await fetch(`${authBase}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show the generic success message — matches backend's no-enumeration policy.
      setSubmitted(true);
    } catch {
      // Even on network error, show the same message to avoid leaking state.
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center p-4 bg-[#FBFAF8] font-sans">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <BrainCircuit className="w-8 h-8 text-green-700" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Forgot Password</h1>
        <p className="text-slate-500 font-medium mt-2 text-center max-w-xs">
          Enter your email and we'll send you a reset link if an account exists.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full">
        {submitted ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold mb-1">Check your inbox</p>
            <p className="text-slate-500 text-sm">
              If an account with <strong>{email}</strong> exists, a reset link has been sent. It expires in 15 minutes.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm text-green-600 font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <Link
              to="/login"
              className="text-center text-sm text-slate-500 font-medium hover:text-slate-700 inline-flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
