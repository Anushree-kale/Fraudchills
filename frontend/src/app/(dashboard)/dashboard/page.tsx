"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchDashboardSummary,
  fetchActiveCases,
  fetchFraudCategories,
  fetchTrendingComplaints,
  type DashboardSummary,
  type ActiveCase,
  type ActiveCasesPage,
  type FraudCategory,
  type Complaint,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(score: number) {
  if (score >= 70) return "var(--danger)";
  if (score >= 40) return "var(--gold)";
  return "var(--success)";
}

function statusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "RESOLVED") return { bg: "rgba(82,142,87,0.12)", color: "var(--success)" };
  if (s === "REVIEW") return { bg: "rgba(201,168,76,0.12)", color: "var(--gold)" };
  return { bg: "rgba(15,15,15,0.06)", color: "var(--muted)" };
}

const TYPE_LABELS: Record<string, string> = {
  SELLER_FRAUD: "Seller Fraud",
  PHISHING: "Phishing",
  UNAUTHORIZED_CHARGE: "Unauth. Charge",
  FAKE_PRODUCT: "Fake Product",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--cream)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem 1.5rem",
      }}
    >
      <p
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-bebas), sans-serif",
          fontSize: "clamp(1.75rem,4vw,2.5rem)",
          color: accent ?? "var(--black)",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>{sub}</p>
      )}
    </div>
  );
}

function TrendingCard({ complaint }: { complaint: Complaint }) {
  const sc = statusColor(complaint.status);
  return (
    <Link
      href={`/complaints/${complaint.id}`}
      style={{
        display: "block",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
        textDecoration: "none",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "0.1em",
          }}
        >
          {complaint.caseNumber}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--gold)" }}>
            {complaint.upvotesCount}
          </span>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--muted)" }}>UPVOTES</span>
        </div>
      </div>
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--black)",
          marginBottom: "0.5rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {complaint.brandName}
      </h3>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--muted)",
          marginBottom: "1.25rem",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.5,
          height: "2.4rem",
        }}
      >
        {complaint.details}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: 99,
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            background: sc.bg,
            color: sc.color,
            textTransform: "uppercase",
          }}
        >
          {complaint.status}
        </span>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--black)" }}>
          {complaint.amount > 0 ? `₹${complaint.amount.toLocaleString()}` : "—"}
        </span>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = session?.user?.email;
  const displayName = session?.user?.name ?? "User";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fdashboard");
    }
  }, [status, router]);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [casesPage, setCasesPage] = useState<ActiveCasesPage | null>(null);
  const [categories, setCategories] = useState<FraudCategory[]>([]);
  const [trending, setTrending] = useState<Complaint[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [casesLoading, setCasesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initial load — summary + categories + trending
  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const [sum, cats, trend] = await Promise.all([
          fetchDashboardSummary(email),
          fetchFraudCategories(email),
          fetchTrendingComplaints(),
        ]);
        setSummary(sum);
        setCategories(cats);
        setTrending(trend);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [email]);

  // cases load — re-runs on filter/page change
  const loadCases = useCallback(async () => {
    if (!email) return;
    setCasesLoading(true);
    try {
      const result = await fetchActiveCases(email, {
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
        q: search || undefined,
      });
      setCasesPage(result);
    } catch {
      // swallow — show empty
    } finally {
      setCasesLoading(false);
    }
  }, [email, page, statusFilter, search]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Loading session…
        </p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!email) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
        }}
      >
        <p>Sign in to access your dashboard.</p>
      </div>
    );
  }

  const totalPages = casesPage ? Math.ceil(casesPage.total / PAGE_SIZE) : 1;

  return (
    <div
      style={{
        maxWidth: "var(--content-max)",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
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
            WELCOME BACK
          </p>
          <h1
            style={{
              fontFamily: "var(--font-bebas), sans-serif",
              fontSize: "clamp(1.75rem,4vw,3rem)",
              color: "var(--black)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            {displayName}
          </h1>
        </div>
        <Link
          href="/complaints/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: "44px",
            padding: "0.65rem 1.25rem",
            background: "var(--black)",
            color: "#fff",
            fontSize: "clamp(0.68rem, 1.5vw, 0.8rem)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          + FILE COMPLAINT
        </Link>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(203,78,78,0.08)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius)",
            padding: "0.75rem 1rem",
            color: "var(--danger)",
            fontSize: "0.88rem",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div style={{ color: "var(--muted)", padding: "2rem 0" }}>Loading summary…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <SummaryCard
            label="Active Cases"
            value={summary?.activeCases ?? 0}
            sub="open + in review"
            accent="var(--gold)"
          />
          <SummaryCard
            label="Resolved"
            value={summary?.resolvedCases ?? 0}
            sub="all time"
            accent="var(--success)"
          />
          <SummaryCard
            label="Amount at Risk"
            value={`₹${(summary?.amountAtRisk ?? 0).toLocaleString()}`}
            sub="across open cases"
            accent="var(--danger)"
          />
          <SummaryCard
            label="Risk Score"
            value={summary?.riskScore ?? 0}
            sub={
              (summary?.riskScore ?? 0) >= 70
                ? "HIGH"
                : (summary?.riskScore ?? 0) >= 40
                  ? "MEDIUM"
                  : "LOW"
            }
            accent={riskColor(summary?.riskScore ?? 0)}
          />
        </div>
      )}

      {/* Fraud Category Pills */}
      {categories.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            flexWrap: "wrap",
            marginBottom: "1.75rem",
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0.3rem 0.75rem",
                border: "1px solid var(--border)",
                borderRadius: 99,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--black)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  display: "inline-block",
                }}
              />
              {TYPE_LABELS[cat.type] ?? cat.type}{" "}
              <span style={{ color: "var(--muted)" }}>{cat.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Trending Reports Section */}
      {!loading && trending.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              Trending Reports
            </h2>
            <Link
              href="/complaints"
              style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)" }}
            >
              EXPLORE ALL →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {trending.slice(0, 3).map((c) => (
              <TrendingCard key={c.id} complaint={c} />
            ))}
          </div>
        </div>
      )}

      {/* Cases Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {/* Table header + filters */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            MY CASES
            {casesPage && (
              <span style={{ marginLeft: 8, color: "var(--black)" }}>
                ({casesPage.total})
              </span>
            )}
          </p>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search cases…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.8rem",
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "var(--cream)",
                color: "var(--black)",
                outline: "none",
                width: 160,
              }}
            />

            {/* Status filter */}
            {["", "OPEN", "REVIEW", "RESOLVED"].map((s) => (
              <button
                key={s || "ALL"}
                onClick={() => { setStatus(s); setPage(1); }}
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.3rem 0.65rem",
                  border: "1px solid",
                  borderColor: statusFilter === s ? "var(--gold)" : "var(--border)",
                  background: statusFilter === s ? "var(--gold-dim)" : "transparent",
                  color: statusFilter === s ? "var(--gold)" : "var(--muted)",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {s || "ALL"}
              </button>
            ))}
          </div>
        </div>

        {/* Table body */}
        {casesLoading ? (
          <div style={{ padding: "2rem 1.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
            Loading cases…
          </div>
        ) : !casesPage || casesPage.items.length === 0 ? (
          <div
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            No cases found.{" "}
            <Link href="/complaints/new" style={{ color: "var(--gold)", fontWeight: 600 }}>
              File your first complaint
            </Link>
            {" · "}
            <Link href="/complaints/my" style={{ color: "var(--gold)", fontWeight: 600 }}>
              My cases list →
            </Link>
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Case", "Title", "Amount", "Status", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.65rem 1.25rem",
                        textAlign: "left",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {casesPage.items.map((c: ActiveCase) => {
                  const sc = statusColor(c.status);
                  return (
                    <tr
                      key={c.caseId}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.78rem",
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.caseId}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          color: "var(--black)",
                          maxWidth: 260,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.title}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontSize: "0.85rem",
                          color: "var(--black)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.amount > 0 ? `₹${c.amount.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.6rem",
                            borderRadius: 99,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            background: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <Link
                          href={
                            c.complaintId
                              ? `/complaints/${c.complaintId}`
                              : "/complaints/my"
                          }
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--gold)",
                          }}
                        >
                          VIEW →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.25rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: "transparent",
                    color: page === 1 ? "var(--muted)" : "var(--black)",
                    cursor: page === 1 ? "default" : "pointer",
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: "transparent",
                    color: page === totalPages ? "var(--muted)" : "var(--black)",
                    cursor: page === totalPages ? "default" : "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}