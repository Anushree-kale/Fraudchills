"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  fetchComplaints,
  upvoteComplaint,
  type Complaint,
  type ComplaintsFilter,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(score: number) {
  if (score >= 70) return { bg: "rgba(203,78,78,0.1)", color: "var(--danger)" };
  if (score >= 40) return { bg: "rgba(201,168,76,0.1)", color: "var(--gold)" };
  return { bg: "rgba(82,142,87,0.1)", color: "var(--success)" };
}

function riskLabel(score: number) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  RESOLVED: { bg: "rgba(82,142,87,0.1)", color: "var(--success)" },
  RESPONDED: { bg: "rgba(201,168,76,0.1)", color: "var(--gold)" },
  PENDING: { bg: "rgba(15,15,15,0.06)", color: "var(--muted)" },
};

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── ComplaintCard ─────────────────────────────────────────────────────────────

function ComplaintCard({
  c,
  onUpvote,
  upvoting,
}: {
  c: Complaint;
  onUpvote: (id: string) => void;
  upvoting: string | null;
}) {
  const risk = riskColor(c.score);
  const statusStyle = STATUS_COLORS[c.status] ?? STATUS_COLORS.PENDING;

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        gap: "1.25rem",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.4)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")
      }
    >
      {/* Upvote */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => onUpvote(c.id)}
          disabled={upvoting === c.id}
          title="Upvote"
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "0.3rem 0.5rem",
            cursor: upvoting === c.id ? "wait" : "pointer",
            color: "var(--muted)",
            fontSize: "0.8rem",
            lineHeight: 1,
          }}
        >
          ▲
        </button>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--black)",
          }}
        >
          {c.upvotesCount}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.7rem",
              color: "var(--muted)",
            }}
          >
            {c.caseNumber}
          </span>

          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.15rem 0.5rem",
              borderRadius: 99,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {c.status}
          </span>

          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.15rem 0.5rem",
              borderRadius: 99,
              background: risk.bg,
              color: risk.color,
            }}
          >
            {riskLabel(c.score)} RISK
          </span>

          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted)" }}>
            {timeAgo(c.createdAt)}
          </span>
        </div>

        {/* Brand + type */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            marginBottom: "0.4rem",
          }}
        >
          <Link
            href={`/brands/${encodeURIComponent(c.brandName)}`}
            style={{
              fontWeight: 800,
              fontSize: "0.95rem",
              color: "var(--black)",
            }}
          >
            {c.brandName}
          </Link>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            — {c.type.replace(/_/g, " ")}
          </span>
        </div>

        {/* Details */}
        <p
          style={{
            fontSize: "0.88rem",
            color: "#555",
            lineHeight: 1.55,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            marginBottom: "0.75rem",
          }}
        >
          {c.details}
        </p>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {c.platform && (
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              via {c.platform}
            </span>
          )}
          {c.amount > 0 && (
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--black)" }}>
              ₹{c.amount.toLocaleString()}
            </span>
          )}
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Score: {c.score}
          </span>
          <Link
            href={`/complaints/${c.id}`}
            style={{
              marginLeft: "auto",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            VIEW →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TYPES = ["", "SELLER_FRAUD", "PHISHING", "UNAUTHORIZED_CHARGE", "FAKE_PRODUCT"];
const STATUSES = ["", "PENDING", "RESPONDED", "RESOLVED"];
const RISKS = ["", "HIGH", "MEDIUM", "LOW"];
const LIMIT = 15;

export default function ComplaintsPage() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [upvoting, setUpvoting] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = useCallback(
    (overrideSearch?: string): ComplaintsFilter => ({
      q: overrideSearch ?? search,
      brand: brand || undefined,
      type: type || undefined,
      status: status || undefined,
      risk: risk || undefined,
      skip: 0,
      limit: LIMIT,
    }),
    [search, brand, type, status, risk]
  );

  // initial + filter-driven load
  const reload = useCallback(
    async (filters: ComplaintsFilter) => {
      setLoading(true);
      try {
        const data = await fetchComplaints(filters);
        setComplaints(data);
        setSkip(data.length);
        setHasMore(data.length === LIMIT);
      } catch {
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    reload(buildFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, type, status, risk]);

  // debounced search
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      reload({ ...buildFilters(val) });
    }, 350);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchComplaints({ ...buildFilters(), skip, limit: LIMIT });
      setComplaints((prev) => [...prev, ...data]);
      setSkip((s) => s + data.length);
      setHasMore(data.length === LIMIT);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUpvote = async (id: string) => {
    if (!email) return alert("Sign in to upvote.");
    setUpvoting(id);
    try {
      const res = await upvoteComplaint(id, email);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, upvotesCount: res.upvotes } : c))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not upvote.");
    } finally {
      setUpvoting(null);
    }
  };

  return (
    <div
      style={{
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        padding: "clamp(1.5rem,4vw,2.5rem) var(--page-gutter)",
        paddingTop: "calc(var(--nav-offset) + clamp(1.5rem,4vw,2rem))",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            PUBLIC RECORD
          </p>
          <h1
            style={{
              fontFamily: "var(--font-bebas), sans-serif",
              fontSize: "clamp(2rem,5vw,3.5rem)",
              color: "var(--black)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Trending Complaints
          </h1>
        </div>
        <Link
          href={email ? "/complaints/new" : "/auth/signin?callbackUrl=%2Fcomplaints%2Fnew"}
          style={{
            padding: "0.7rem 1.4rem",
            background: "var(--black)",
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderRadius: 2,
          }}
        >
          + REPORT FRAUD
        </Link>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search brand, details…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            padding: "0.45rem 0.85rem",
            fontSize: "0.82rem",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--surface)",
            color: "var(--black)",
            outline: "none",
            width: 200,
          }}
        />

        {/* Brand input */}
        <input
          type="text"
          placeholder="Filter by brand…"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={{
            padding: "0.45rem 0.85rem",
            fontSize: "0.82rem",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--surface)",
            color: "var(--black)",
            outline: "none",
            width: 160,
          }}
        />

        {/* Type select */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            padding: "0.45rem 0.75rem",
            fontSize: "0.78rem",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--surface)",
            color: type ? "var(--black)" : "var(--muted)",
            outline: "none",
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t ? t.replace(/_/g, " ") : "All Types"}
            </option>
          ))}
        </select>

        {/* Status select */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            padding: "0.45rem 0.75rem",
            fontSize: "0.78rem",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--surface)",
            color: status ? "var(--black)" : "var(--muted)",
            outline: "none",
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All Status"}
            </option>
          ))}
        </select>

        {/* Risk filter pills */}
        {RISKS.map((r) => (
          <button
            key={r || "ALL"}
            onClick={() => setRisk(r)}
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.3rem 0.65rem",
              border: "1px solid",
              borderColor:
                risk === r
                  ? r === "HIGH"
                    ? "var(--danger)"
                    : r === "MEDIUM"
                      ? "var(--gold)"
                      : r === "LOW"
                        ? "var(--success)"
                        : "var(--gold)"
                  : "var(--border)",
              background:
                risk === r
                  ? r === "HIGH"
                    ? "rgba(203,78,78,0.08)"
                    : r === "MEDIUM"
                      ? "var(--gold-dim)"
                      : r === "LOW"
                        ? "rgba(82,142,87,0.08)"
                        : "var(--gold-dim)"
                  : "transparent",
              color:
                risk === r
                  ? r === "HIGH"
                    ? "var(--danger)"
                    : r === "MEDIUM"
                      ? "var(--gold)"
                      : r === "LOW"
                        ? "var(--success)"
                        : "var(--gold)"
                  : "var(--muted)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {r || "ALL RISK"}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ color: "var(--muted)", padding: "3rem 0", textAlign: "center" }}>
          Loading complaints…
        </div>
      ) : complaints.length === 0 ? (
        <div
          style={{
            padding: "4rem 1rem",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "0.95rem",
          }}
        >
          No complaints found. Try adjusting your filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {complaints.map((c) => (
            <ComplaintCard
              key={c.id}
              c={c}
              onUpvote={handleUpvote}
              upvoting={upvoting}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: "0.7rem 2rem",
              border: "1px solid var(--border)",
              background: "transparent",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--black)",
              borderRadius: 2,
              cursor: loadingMore ? "wait" : "pointer",
            }}
          >
            {loadingMore ? "Loading…" : "LOAD MORE"}
          </button>
        </div>
      )}
    </div>
  );
}