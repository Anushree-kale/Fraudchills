"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Shield, Activity } from "lucide-react";
import {
  fetchMlHealth,
  predictFraud,
  type FraudPredictResult,
  type MlHealth,
} from "@/lib/api";

export default function MlScorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [health, setHealth] = useState<MlHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [orders24h, setOrders24h] = useState("0");
  const [result, setResult] = useState<FraudPredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fml-score");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await fetchMlHealth();
        if (!cancelled) setHealth(h);
      } catch (e) {
        if (!cancelled) {
          setHealthError(e instanceof Error ? e.message : "Could not reach ML health endpoint.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runPredict = async () => {
    const email = session?.user?.email;
    if (!email) return;
    setLoading(true);
    setPredictError(null);
    setResult(null);
    try {
      const r = await predictFraud(email, {
        amount: parseFloat(amount) || 0,
        cardLast4: cardLast4.replace(/\D/g, "").slice(-4) || "",
        numOrdersLast24h: Math.max(0, parseInt(orders24h, 10) || 0),
      });
      setResult(r);
    } catch (e) {
      setPredictError(e instanceof Error ? e.message : "Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  const scorePct = result ? Math.round(Math.min(1, Math.max(0, result.riskScore)) * 1000) / 10 : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-0 pb-8">
      <div className="mb-8">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Tools
        </p>
        <h1
          className="font-bebas text-[clamp(2rem,5vw,2.75rem)] leading-none tracking-tight text-[var(--black)]"
        >
          ML RISK SCORE
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--muted)]">
          Live scoring uses the Fraudchills API{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[13px]">/predict-fraud</code>{" "}
          endpoint (same signal used for transaction checks).
        </p>
      </div>

      <div
        className="mb-8 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        role="status"
      >
        <div className="mb-3 flex items-center gap-2 text-[var(--gold)]">
          <Activity className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Model status</span>
        </div>
        {healthError && (
          <div className="flex gap-2 rounded border border-[var(--danger)]/25 bg-[var(--danger)]/10 p-3 text-[14px] text-[var(--danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{healthError}</span>
          </div>
        )}
        {health && !healthError && (
          <ul className="space-y-2 text-[14px] text-[var(--black)]">
            <li className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[var(--muted)]">Training pipeline</span>
              <span className="font-semibold">{health.modelLoaded ? "Ready" : "Heuristic mode"}</span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[var(--muted)]">Dataset rows</span>
              <span className="font-mono">{health.datasetRows.toLocaleString()}</span>
            </li>
            {health.featureColumns.length > 0 && (
              <li className="text-[13px] text-[var(--muted)]">
                Features: {health.featureColumns.slice(0, 8).join(", ")}
                {health.featureColumns.length > 8 ? "…" : ""}
              </li>
            )}
          </ul>
        )}
        {!health && !healthError && (
          <p className="text-[14px] text-[var(--muted)]">Checking backend…</p>
        )}
      </div>

      <div className="rounded-md border border-[var(--border)] bg-[var(--cream)] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--black)]" aria-hidden />
          <h2 className="text-[15px] font-bold uppercase tracking-[0.12em]">Run a check</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Transaction amount (₹)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              className="min-h-[44px] w-full rounded border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] outline-none focus:border-[var(--gold)]"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Card last 4 (optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="4242"
              className="min-h-[44px] w-full rounded border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] outline-none focus:border-[var(--gold)]"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Orders last 24h
            </label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="min-h-[44px] w-full rounded border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] outline-none focus:border-[var(--gold)]"
              value={orders24h}
              onChange={(e) => setOrders24h(e.target.value)}
            />
          </div>
        </div>

        {predictError && (
          <div className="mt-4 flex gap-2 rounded border border-[var(--danger)]/25 bg-[var(--danger)]/10 p-3 text-[14px] text-[var(--danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{predictError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={runPredict}
          disabled={loading}
          className="mt-6 min-h-[48px] w-full rounded bg-[var(--black)] text-[13px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Scoring…" : "Get risk score"}
        </button>

        {result && scorePct !== null && (
          <div className="mt-8 border-t border-[var(--border)] pt-6">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Result (0–100 scale)
            </p>
            <p className="font-bebas text-[clamp(3rem,12vw,4.5rem)] leading-none text-[var(--gold)]">
              {scorePct}
              <span className="text-[0.45em] text-[var(--muted)]">%</span>
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[var(--black)]">
              {result.flagged ? "Flagged for review" : "Within normal range"}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">{result.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
