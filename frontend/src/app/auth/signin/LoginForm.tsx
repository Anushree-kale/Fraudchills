"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

function getErrorMessage(err: string) {
  switch (err) {
    case "CredentialsSignin":
      return "Invalid email or password.";
    case "OAuthAccountNotLinked":
      return "This email is already associated with another provider.";
    case "Callback":
      return (
        "Sign-in could not finish (often a database timeout from the hosting region, or Google redirect / NEXTAUTH_URL mismatch). " +
        "If it keeps happening, try email login or confirm Vercel has DATABASE_URL (external Postgres URL), NEXTAUTH_URL, and Google’s redirect URI " +
        "https://your-domain/api/auth/callback/google."
      );
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

export function LoginForm({
  error,
  afterSignIn,
}: {
  error: string | undefined;
  afterSignIn: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", {
      email,
      password,
      callbackUrl: afterSignIn,
    });
    setLoading(false);
  };

  return (
    <div className="w-full max-w-[440px] animate-fade-up">
      <div className="bg-[var(--dark-card)] border border-[var(--gold-20)] p-10 shadow-3xl">
        <div className="text-center mb-8">
          <Link href="/" className="font-bebas text-3xl tracking-tight inline-block mb-6">
            <span className="text-[var(--gold)]">FRAUD</span>
            <span className="text-[var(--obsidian)]">CHILLS_</span>
          </Link>
          <div className="w-full h-px bg-[var(--gold-20)] mb-8" />
          <h2 className="font-bebas text-4xl text-[var(--obsidian)] mb-2 tracking-wide">Sign In</h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">Access the public fraud record</p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: afterSignIn })}
          className="w-full flex items-center justify-center gap-3 bg-transparent border border-[var(--gold-20)] py-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--gold)] hover:bg-[var(--gold-10)] transition-all mb-8"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-[var(--obsidian)] opacity-5" />
          <span className="font-mono text-[9px] uppercase text-[var(--dim)]">or</span>
          <div className="flex-1 h-px bg-[var(--obsidian)] opacity-5" />
        </div>

        <form onSubmit={handleCredentialsLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--gold)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--dark)] border border-white/10 px-5 py-4 font-mono text-sm text-white focus:outline-none focus:border-[var(--gold)] transition-colors"
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--gold)]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--dark)] border border-white/10 px-5 py-4 font-mono text-sm text-white focus:outline-none focus:border-[var(--gold)] transition-colors pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--gold)] text-black py-4 font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--gold-light)] hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 border border-red-500/20 bg-red-500/10">
            <p className="font-mono text-[10px] uppercase text-red-500 text-center tracking-widest leading-relaxed">
              {getErrorMessage(error)}
            </p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--obsidian)] transition-colors">
            Don&apos;t have an account? Request access →
          </Link>
        </div>
      </div>
    </div>
  );
}
