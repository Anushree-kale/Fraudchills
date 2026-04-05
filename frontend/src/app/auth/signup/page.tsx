"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-brand">Fraudchills</p>
          <h2>Create account</h2>
          <p>Sign up with Google to file complaints and access the dashboard.</p>
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
          <label className="form-label" htmlFor="name-disabled">
            Full name
          </label>
          <input id="name-disabled" type="text" className="form-input" placeholder="—" disabled />
          <label className="form-label" htmlFor="email2-disabled" style={{ marginTop: "1rem" }}>
            Email
          </label>
          <input id="email2-disabled" type="email" className="form-input" placeholder="—" disabled />
          <p style={{ fontSize: "0.8rem", color: "var(--ivory-muted)", marginTop: "0.5rem" }}>
            Direct sign-up is disabled. Use Google.
          </p>
        </div>

        <div className="auth-footer">
          Already have an account?
          <Link href="/auth/signin" className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
