"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { fetchEvents, updateEventLabel, type FraudEvent } from "@/lib/api";

type FilterTab = "all" | "unlabeled" | "legitimate" | "fraud";

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("unlabeled");
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fevents");
    }
  }, [status, router]);

  const loadEvents = async (showRefreshing = false) => {
    const email = session?.user?.email;
    if (!email) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchEvents(email, { limit: 100 });
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadEvents();
    }
  }, [status]);

  const handleLabel = async (eventId: string, label: number) => {
    const email = session?.user?.email;
    if (!email) return;

    setActionInProgress((prev) => ({ ...prev, [eventId]: true }));
    try {
      const updated = await updateEventLabel(email, eventId, label);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, label: updated.label } : ev))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to label event.");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const stats = useMemo(() => {
    const total = events.length;
    const unlabeled = events.filter((e) => e.label === null || e.label === undefined).length;
    const legitimate = events.filter((e) => e.label === 0).length;
    const fraud = events.filter((e) => e.label === 1).length;
    return { total, unlabeled, legitimate, fraud };
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeTab === "unlabeled") {
      return events.filter((e) => e.label === null || e.label === undefined);
    }
    if (activeTab === "legitimate") {
      return events.filter((e) => e.label === 0);
    }
    if (activeTab === "fraud") {
      return events.filter((e) => e.label === 1);
    }
    return events;
  }, [events, activeTab]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-0 pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Review & Ground Truth
          </p>
          <h1 className="font-bebas text-[clamp(2.25rem,5vw,3rem)] leading-none tracking-tight text-[var(--black)]">
            EVENT LABELING
          </h1>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--muted)]">
            Assign verified ground truth labels to transactions (0 = Legitimate, 1 = Fraud) to evaluate model precision.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadEvents(true)}
          disabled={refreshing || loading}
          className="flex h-10 items-center gap-2 self-start rounded border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-bold tracking-wider text-[var(--black)] transition hover:bg-[var(--cream)] disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[var(--gold)]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Total Scored
          </span>
          <p className="mt-1 font-bebas text-3xl text-[var(--black)]">{stats.total}</p>
        </div>
        <div className="rounded-md border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
            Unlabeled Queue
          </span>
          <p className="mt-1 font-bebas text-3xl text-[var(--gold)]">{stats.unlabeled}</p>
        </div>
        <div className="rounded-md border border-emerald-300/60 bg-emerald-50/70 p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
            Legitimate (0)
          </span>
          <p className="mt-1 font-bebas text-3xl text-emerald-700">{stats.legitimate}</p>
        </div>
        <div className="rounded-md border border-red-300/60 bg-red-50/70 p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-800">
            Confirmed Fraud (1)
          </span>
          <p className="mt-1 font-bebas text-3xl text-red-700">{stats.fraud}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("unlabeled")}
          className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition ${
            activeTab === "unlabeled"
              ? "bg-[var(--black)] text-white"
              : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--black)]"
          }`}
        >
          Unlabeled ({stats.unlabeled})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition ${
            activeTab === "all"
              ? "bg-[var(--black)] text-white"
              : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--black)]"
          }`}
        >
          All Events ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("legitimate")}
          className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition ${
            activeTab === "legitimate"
              ? "bg-emerald-800 text-white"
              : "bg-[var(--surface)] text-[var(--muted)] hover:text-emerald-700"
          }`}
        >
          Legitimate ({stats.legitimate})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fraud")}
          className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition ${
            activeTab === "fraud"
              ? "bg-red-800 text-white"
              : "bg-[var(--surface)] text-[var(--muted)] hover:text-red-700"
          }`}
        >
          Fraud ({stats.fraud})
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[14px] text-[var(--danger)]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--gold)]" />
          <p className="text-[14px]">Loading recorded events…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredEvents.length === 0 && (
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[var(--gold)]" />
          <p className="text-[16px] font-semibold text-[var(--black)]">No events found</p>
          <p className="mt-1 text-[13px]">
            {activeTab === "unlabeled"
              ? "All caught up! There are no unlabeled events waiting in the queue."
              : "No transactions match this category."}
          </p>
        </div>
      )}

      {/* Events List */}
      {!loading && filteredEvents.length > 0 && (
        <div className="space-y-3">
          {filteredEvents.map((ev) => {
            const isPending = actionInProgress[ev.id];
            const riskPct =
              ev.riskScore != null
                ? Math.round(Math.min(1, Math.max(0, ev.riskScore)) * 1000) / 10
                : null;

            return (
              <div
                key={ev.id}
                className="flex flex-col justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--gold)]/40 sm:flex-row sm:items-center sm:p-5"
              >
                {/* Left details */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[var(--black)] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {ev.eventType}
                    </span>
                    <span className="font-mono text-[12px] text-[var(--muted)]">
                      {ev.id.slice(0, 8)}...
                    </span>
                    {ev.createdAt && (
                      <span className="text-[11px] text-[var(--muted)]">
                        {new Date(ev.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--black)]">
                    <div>
                      <span className="text-[var(--muted)]">Amount: </span>
                      <span className="font-bold">₹{ev.amount.toLocaleString()}</span>
                    </div>

                    {riskPct !== null && (
                      <div>
                        <span className="text-[var(--muted)]">ML Score: </span>
                        <span
                          className={`font-semibold ${
                            riskPct >= 70
                              ? "text-red-600"
                              : riskPct >= 40
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {riskPct}%
                        </span>
                      </div>
                    )}

                    {ev.ip && (
                      <div className="font-mono text-[12px] text-[var(--muted)]">
                        IP: {ev.ip}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right action / status */}
                <div className="flex items-center gap-2 sm:shrink-0">
                  {ev.label === 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Legitimate (0)
                    </span>
                  )}

                  {ev.label === 1 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[12px] font-bold text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Confirmed Fraud (1)
                    </span>
                  )}

                  {ev.label === null || ev.label === undefined ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLabel(ev.id, 0)}
                        disabled={isPending}
                        className="flex h-9 items-center gap-1.5 rounded border border-emerald-600/40 bg-emerald-50/70 px-3 text-[12px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        Mark Legitimate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLabel(ev.id, 1)}
                        disabled={isPending}
                        className="flex h-9 items-center gap-1.5 rounded border border-red-300 bg-red-50/70 px-3 text-[12px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        )}
                        Confirm Fraud
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
