"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchComplaint,
  fetchComplaintTimeline,
  type Complaint,
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

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<ComplaintEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setErr("Missing case id.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [c, ev] = await Promise.all([
          fetchComplaint(id),
          fetchComplaintTimeline(id),
        ]);
        if (!cancelled) {
          setComplaint(c);
          setTimeline(ev);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Could not load this case.");
          setComplaint(null);
          setTimeline([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-[min(48rem,100%)]">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--black)]"
      >
        ← Back to dashboard
      </Link>

      {loading && <p className="text-[var(--muted)]">Loading case…</p>}

      {err && !loading && (
        <div className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[14px] text-[var(--danger)]">
          {err}
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            Use the case id (UUID) from your dashboard or{" "}
            <Link href="/complaints/my" className="font-semibold text-[var(--gold)] underline">
              My cases
            </Link>
            .
          </p>
        </div>
      )}

      {complaint && !loading && (
        <div className="space-y-8">
          <header className="border-b border-[var(--border)] pb-6">
            <p className="mb-1 font-mono text-[12px] text-[var(--muted)]">
              {complaint.caseNumber || "—"}
            </p>
            <h1 className="font-bebas text-[clamp(1.75rem,5vw,2.5rem)] leading-none tracking-tight text-[var(--black)]">
              {complaint.brandName}
            </h1>
            <p className="mt-2 text-[14px] text-[var(--muted)]">
              {complaint.type.replace(/_/g, " ")} · {complaint.status}
            </p>
            {complaint.amount > 0 && (
              <p className="mt-1 text-[15px] font-semibold text-[var(--black)]">
                ₹{complaint.amount.toLocaleString()}
              </p>
            )}
          </header>

          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Details
            </h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--black)]">
              {complaint.details}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Timeline
            </h2>
            {timeline.length === 0 ? (
              <p className="text-[14px] text-[var(--muted)]">
                No events yet. Events appear when the case is updated (filed, responded, resolved).
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
          </section>
        </div>
      )}
    </div>
  );
}
