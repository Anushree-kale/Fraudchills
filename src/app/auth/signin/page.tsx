"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-brand">Fraudchills</p>
          <h2>Sign in</h2>
          <p>Use your Google account to continue.</p>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/complaints/new" })}
          className="social-btn"
        >
          <img src="https://authjs.dev/img/providers/google.svg" alt="" className="social-icon" />
          Continue with Google
        </button>

        <div className="divider">or</div>

        <div className="form-group">
          <label className="form-label" htmlFor="email-disabled">
            Email
          </label>
          <input id="email-disabled" type="email" className="form-input" placeholder="name@example.com" disabled />
          <p style={{ fontSize: "0.8rem", color: "var(--ivory-muted)", marginTop: "0.5rem" }}>
            Email login is disabled. Use Google.
          </p>
        </div>

        <div className="auth-footer">
          Need an account?
          <Link href="/auth/signup" className="auth-link">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
