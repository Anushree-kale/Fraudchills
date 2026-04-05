"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Lock, Save, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetchJson } from "@/lib/api";

type MeUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  credibilityScore?: number;
  credibility_score?: number;
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const email = session?.user?.email ?? "";

  const load = useCallback(async () => {
    if (!email) return;
    try {
      const u = await apiFetchJson<MeUser>("/users/me", email);
      setName(u.name ?? "");
      setImage(u.image ?? "");
    } catch {
      setName(session?.user?.name ?? "");
      setImage(session?.user?.image ?? "");
    }
  }, [email, session?.user?.name, session?.user?.image]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=%2Fsettings");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setMsg(null);
    setErr(null);
    setLoadingProfile(true);
    try {
      await apiFetchJson("/users/me", email, {
        method: "PATCH",
        body: JSON.stringify({ name: name || null, image: image || null }),
      });
      setMsg("Profile updated.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setMsg(null);
    setErr(null);
    if (newPw.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setErr("New password and confirmation do not match.");
      return;
    }
    setLoadingPw(true);
    try {
      await apiFetchJson("/users/me/password", email, {
        method: "PATCH",
        body: JSON.stringify({
          newPassword: newPw,
          currentPassword: currentPw || undefined,
        }),
      });
      setMsg("Password saved. You can sign in with email and password if credentials sign-in is enabled.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setLoadingPw(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="py-24 text-center text-ink-muted text-sm font-bold uppercase tracking-widest">
        {status === "loading" ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-gold">Account</p>
        <h1 className="mt-1 text-2xl font-black text-ink">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted">Update how you appear and manage your password.</p>
      </div>

      {(msg || err) && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            err ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {err ? null : <CheckCircle2 size={18} />}
          {err ?? msg}
        </div>
      )}

      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm md:p-8"
      >
        <div className="flex items-center gap-3 border-b border-black/5 pb-4">
          <div className="rounded-xl bg-ink p-2.5 text-cream">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-ink">Profile</h2>
            <p className="text-[11px] text-ink-muted">Name and avatar URL (shown in the app header).</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-ink-muted">Email</span>
            <input
              readOnly
              value={email}
              className="mt-1 w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 py-2.5 text-sm text-ink-muted"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-ink-muted">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/20"
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-ink-muted">Image URL</span>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/20"
              placeholder="https://…"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loadingProfile}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-cream transition hover:bg-ink/90 disabled:opacity-60"
          >
            {loadingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save profile
          </button>
        </div>
      </form>

      <form
        onSubmit={savePassword}
        className="rounded-2xl border border-black/[0.06] bg-gradient-to-br from-white to-amber-50/40 p-6 shadow-sm md:p-8"
      >
        <div className="flex items-center gap-3 border-b border-black/5 pb-4">
          <div className="rounded-xl bg-accent-gold/20 p-2.5 text-ink">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-ink">Password</h2>
            <p className="text-[11px] text-ink-muted">
              Set a password for email login, or change it if you already use one. Leave “current” empty if you
              sign in with Google only and are setting a password for the first time.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-ink-muted">Current password (if any)</span>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/20"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-ink-muted">New password</span>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/20"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-ink-muted">Confirm new password</span>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/20"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loadingPw || !newPw}
            className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-cream transition hover:bg-ink/90 disabled:opacity-60"
          >
            {loadingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Save password
          </button>
        </div>
      </form>
    </div>
  );
}
