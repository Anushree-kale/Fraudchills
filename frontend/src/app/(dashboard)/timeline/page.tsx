"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Clock, Loader2 } from "lucide-react";
import {
  fetchActiveCases,
  fetchComplaintTimeline,
  type ActiveCase,
  type ComplaintEvent,
} from "@/lib/api";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function TimelineViewerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = session?.user?.email;

  const [cases, setCases] = useState<ActiveCase[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [timeline, setTimeline] = useState<ComplaintEvent[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    if (!email) return;
    setLoadingCases(true);
    setErr(null);
    try {
      const page = await fetchActiveCases(email, { page: 1, pageSize: 50 });
      setCases(page.items);
      setSelectedId((prev) => {
        if (prev) return prev;
        const first = page.items.find((i) => i.complaintId) ?? page.items[0];
        return first?.complaintId ?? "";
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load cases.");
      setCases([]);
    } finally {
      setLoadingCases(false);
    }
  }, [email]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Ftimeline");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && email) void loadCases();
  }, [status, email, loadCases]);

  useEffect(() => {
    if (!selectedId) {
      setTimeline([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingEvents(true);
      try {
        const ev = await fetchComplaintTimeline(selectedId);
        if (!cancelled) setTimeline(ev);
      } catch {
        if (!cancelled) setTimeline([]);
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="py-20 text-center text-sm text-[var(--muted)]">
        {status === "loading" ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-10">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Tools</p>
        <h1 className="font-bebas text-[clamp(2rem,5vw,2.75rem)] leading-none text-[var(--black)]">
          Timeline viewer
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--muted)]">
          Case timelines come from the API{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[13px]">
            GET /complaints/{"{id}"}/timeline
          </code>
          . Pick one of your cases below.
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-[var(--danger)]/25 bg-[var(--danger)]/10 p-4 text-[14px] text-[var(--danger)]">
          {err}
        </div>
      )}

      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
          Select case
        </label>
        {loadingCases ? (
          <div className="flex items-center gap-2 py-6 text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your cases…
          </div>
        ) : cases.length === 0 ? (
          <p className="py-6 text-[14px] text-[var(--muted)]">
            No cases yet.{" "}
            <Link href="/complaints/new" className="font-semibold text-[var(--gold)] underline">
              File a complaint
            </Link>
          </p>
        ) : cases.every((c) => !c.complaintId) ? (
          <p className="py-2 text-[14px] text-[var(--muted)]">
            Your API must return <code className="text-[13px]">complaintId</code> on active cases. Update the
            backend or open a case from{" "}
            <Link href="/complaints/my" className="font-semibold text-[var(--gold)] underline">
              My cases
            </Link>
            .
          </p>
        ) : (
          <select
            className="min-h-[48px] w-full rounded border border-[var(--border)] bg-[var(--cream)] px-3 text-[16px] outline-none focus:border-[var(--gold)]"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {cases
              .filter((c) => c.complaintId)
              .map((c) => (
                <option key={c.complaintId} value={c.complaintId}>
                  {c.caseId} — {c.title}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="rounded-md border border-[var(--border)] bg-[var(--cream)] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-[var(--black)]">
          <Clock className="h-5 w-5 shrink-0" aria-hidden />
          <h2 className="text-[14px] font-bold uppercase tracking-[0.12em]">Events</h2>
        </div>

        {!selectedId ? (
          <p className="text-[14px] text-[var(--muted)]">Choose a case to load its timeline.</p>
        ) : loadingEvents ? (
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading timeline…
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">
            No timeline events for this case yet. Open the full record for more context:{" "}
            <Link href={`/complaints/${selectedId}`} className="font-semibold text-[var(--gold)] underline">
              Case detail
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-5">
            {timeline.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--gold)]"
                  aria-hidden
                />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--gold)]">
                    {ev.eventType.replace(/_/g, " ")}
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">{formatWhen(ev.createdAt)}</p>
                  {ev.note && (
                    <p className="mt-1 text-[14px] text-[var(--black)]">{ev.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
