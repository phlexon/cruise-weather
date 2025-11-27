import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type Mode = "signin" | "signup";

export default function AuthPanel() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  // Logged-in view
  if (user) {
    return (
      <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-100 bg-slate-900/70 border border-slate-700 rounded-full px-3 py-2">
        <span>Signed in as {user.email ?? "account"}</span>
        <button
          className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 transition text-xs"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  // Logged-out view: small auth card
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const fn = mode === "signin" ? signIn : signUp;
    const err = await fn(email.trim(), password);
    if (err) setErrorMsg(err.message);
    setSubmitting(false);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 text-slate-50 w-full max-w-xs shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-sm">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h2>
        <button
          type="button"
          className="text-[11px] text-amber-300 underline"
          onClick={() =>
            setMode((prev) => (prev === "signin" ? "signup" : "signin"))
          }
        >
          {mode === "signin" ? "Need an account?" : "Have an account?"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMsg && (
          <p className="text-[11px] text-red-400 leading-snug">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 text-slate-900 font-semibold py-2 text-xs sm:text-sm hover:bg-amber-300 disabled:opacity-60"
        >
          {submitting
            ? "Please wait…"
            : mode === "signin"
            ? "Sign in"
            : "Sign up"}
        </button>
      </form>
    </div>
  );
}
