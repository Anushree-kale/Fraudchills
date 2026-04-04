"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { apiFetchJson } from "@/lib/api";

type Row = Record<string, unknown>;

export default function MyComplaintsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await apiFetchJson<{ complaints?: Row[] }>("/users/me/dashboard", session.user.email);
      setRows(d.complaints ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=%2Fcomplaints%2Fmy");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="py-20 text-center text-ink-muted text-sm font-bold uppercase tracking-widest">
        {status === "loading" ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-gold">Cases</p>
          <h1 className="text-2xl font-black text-ink">My cases</h1>
          <p className="mt-1 text-sm text-ink-muted">Complaints you have filed on Fraudchills.</p>
        </div>
        <Link href="/complaints/new" className="btn-black !py-2 !px-4 !text-[10px] !rounded-full uppercase font-black">
          New report
        </Link>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{err}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-black/5 px-6 py-4">
          <FileText size={18} className="text-accent-gold" />
          <h2 className="text-sm font-black uppercase text-ink">Your filings</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ink-muted">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-ink-muted">
            No cases yet.{" "}
            <Link href="/complaints/new" className="font-bold text-accent-gold underline">
              File a complaint
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const cn = String(c.caseNumber ?? c.case_number ?? "—");
                  const typ = String(c.type ?? "—").replace(/_/g, " ");
                  const brand = String(c.brandName ?? c.brand_name ?? "—");
                  const st = String(c.status ?? "—").toUpperCase();
                  const score = c.score != null ? Number(c.score) : null;
                  return (
                    <tr key={cn + i}>
                      <td className="font-mono text-xs font-bold">{cn}</td>
                      <td className="text-xs capitalize">{typ}</td>
                      <td className="text-xs font-bold">{brand}</td>
                      <td>
                        <span className={`status-pill status-${st.toLowerCase()}`}>{st}</span>
                      </td>
                      <td className="text-xs font-mono">{score != null ? score.toFixed(0) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
