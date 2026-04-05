"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  fetchAnalyticsSummary,
  fetchTrends,
  fetchTopBrands,
  fetchFraudCategories,
  fetchMlHealth,
  type AnalyticsSummary,
  type TrendData,
  type TopBrand,
  type FraudCategory,
  type MlHealth,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(score: number) {
  if (score >= 70) return "var(--danger)";
  if (score >= 40) return "var(--gold)";
  return "var(--success)";
}

function riskLabel(score: number) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

const TYPE_LABELS: Record<string, string> = {
  SELLER_FRAUD: "Seller Fraud",
  PHISHING: "Phishing",
  UNAUTHORIZED_CHARGE: "Unauthorized Charge",
  FAKE_PRODUCT: "Fake Product",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
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
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem 1.5rem",
      }}
    >
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "clamp(1.5rem,3.5vw,2.25rem)",
          fontWeight: 800,
          color: accent ?? "var(--black)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontFamily: "var(--font-bebas), sans-serif",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.35rem" }}>{sub}</p>
      )}
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      style={{
        height: 6,
        background: "rgba(15,15,15,0.08)",
        borderRadius: 99,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 99,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function TrendChart({ data }: { data: TrendData[] }) {
  if (!data.length)
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>
        No trend data available.
      </p>
    );

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, width: "100%" }}>
      {data.map((d) => {
        const h = Math.max(4, (d.count / maxCount) * 130);
        const color = riskColor(d.avgScore);
        return (
          <div
            key={d.periodLabel}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            title={`${d.periodLabel}: ${d.count} complaints, avg score ${d.avgScore}`}
          >
            <div
              style={{
                width: "100%",
                height: h,
                background: color,
                opacity: 0.75,
                borderRadius: "3px 3px 0 0",
                transition: "height 0.4s ease",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "var(--muted)",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                textAlign: "center",
              }}
            >
              {d.periodLabel.slice(5, 7)}/{d.periodLabel.slice(2, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Period = "week" | "month";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [topBrands, setTopBrands] = useState<TopBrand[]>([]);
  const [categories, setCategories] = useState<FraudCategory[]>([]);
  const [mlHealth, setMlHealth] = useState<MlHealth | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const [sum, trd, brands, cats, ml] = await Promise.all([
        fetchAnalyticsSummary(email),
        fetchTrends(email, period),
        fetchTopBrands(email),
        fetchFraudCategories(email),
        fetchMlHealth(),
      ]);
      setSummary(sum);
      setTrends(trd);
      setTopBrands(brands);
      setCategories(cats);
      setMlHealth(ml);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [email, period]);

  useEffect(() => {
    load();
  }, [load]);

  const totalByType = summary
    ? Object.values(summary.complaintsByType).reduce((a, b) => a + b, 0)
    : 0;

  const totalByStatus = summary
    ? Object.values(summary.complaintsByStatus).reduce((a, b) => a + b, 0)
    : 0;

  if (!email) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <p style={{ fontSize: "1rem" }}>Sign in to view analytics.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "var(--content-max)",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "0.4rem",
          }}
        >
          FRAUD INTELLIGENCE
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
          Analytics Dashboard
        </h1>

        {/* ML badge */}
        {mlHealth && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: "0.75rem",
              padding: "0.35rem 0.75rem",
              border: "1px solid var(--border)",
              borderRadius: 99,
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: mlHealth.modelLoaded ? "var(--success)" : "var(--muted)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: mlHealth.modelLoaded ? "var(--success)" : "var(--muted)",
                display: "inline-block",
              }}
            />
            ML {mlHealth.modelLoaded ? "ONLINE" : "OFFLINE"} —{" "}
            {mlHealth.datasetRows.toLocaleString()} TRAINING ROWS
          </div>
        )}
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

      {loading ? (
        <div style={{ color: "var(--muted)", padding: "3rem 0", textAlign: "center" }}>
          Loading analytics…
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <StatCard
              label="Total Complaints"
              value={summary?.totalComplaints.toLocaleString() ?? "—"}
            />
            <StatCard
              label="Resolution Rate"
              value={`${summary?.resolutionRate ?? 0}%`}
              sub={`${summary?.resolvedCount ?? 0} resolved`}
              accent="var(--success)"
            />
            <StatCard
              label="Avg Risk Score"
              value={`${summary?.avgRiskScore ?? 0}`}
              sub={riskLabel(summary?.avgRiskScore ?? 0)}
              accent={riskColor(summary?.avgRiskScore ?? 0)}
            />
            <StatCard
              label="High-Risk Cases"
              value={summary?.highRiskCount ?? "—"}
              sub="score ≥ 70"
              accent="var(--danger)"
            />
          </div>

          {/* ── Trends + Breakdown row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            {/* Trend Chart */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem 1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  COMPLAINT VOLUME
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["week", "month"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        padding: "0.25rem 0.6rem",
                        border: "1px solid",
                        borderColor: period === p ? "var(--gold)" : "var(--border)",
                        background: period === p ? "var(--gold-dim)" : "transparent",
                        color: period === p ? "var(--gold)" : "var(--muted)",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart data={trends} />
            </div>

            {/* Fraud Categories */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem 1.5rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "1.25rem",
                }}
              >
                FRAUD CATEGORIES
              </p>
              {categories.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No data.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {categories.map((cat) => (
                    <div key={cat.type}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--black)",
                        }}
                      >
                        <span>{TYPE_LABELS[cat.type] ?? cat.type}</span>
                        <span style={{ color: "var(--muted)" }}>
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <MiniBar pct={cat.percentage} color="var(--gold)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Status Breakdown + Top Brands row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              gap: "1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            {/* Status breakdown */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem 1.5rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "1.25rem",
                }}
              >
                BY STATUS
              </p>
              {summary &&
                Object.entries(summary.complaintsByStatus).map(([status, count]) => {
                  const pct = totalByStatus ? (count / totalByStatus) * 100 : 0;
                  const color =
                    status === "RESOLVED"
                      ? "var(--success)"
                      : status === "PENDING"
                        ? "var(--gold)"
                        : "var(--muted)";
                  return (
                    <div key={status} style={{ marginBottom: "0.85rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--black)",
                          marginBottom: 5,
                        }}
                      >
                        <span>{status}</span>
                        <span style={{ color: "var(--muted)" }}>
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <MiniBar pct={pct} color={color} />
                    </div>
                  );
                })}
            </div>

            {/* Top Brands */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem 1.5rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "1.25rem",
                }}
              >
                TOP BRANDS BY COMPLAINTS
              </p>
              {topBrands.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No data.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {topBrands.map((b, i) => {
                    const resolveRate = b.count
                      ? Math.round((b.resolvedCount / b.count) * 100)
                      : 0;
                    return (
                      <div
                        key={b.brandName}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.85rem",
                          padding: "0.6rem 0",
                          borderBottom:
                            i < topBrands.length - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: "0.72rem",
                            color: "var(--muted)",
                            width: 18,
                            flexShrink: 0,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            color: "var(--black)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.brandName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.count} complaints
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: riskColor(b.avgScore),
                            padding: "0.2rem 0.5rem",
                            border: `1px solid ${riskColor(b.avgScore)}`,
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {riskLabel(b.avgScore)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--success)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {resolveRate}% resolved
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Type Breakdown ── */}
          {summary && Object.keys(summary.complaintsByType).length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1.25rem 1.5rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "1.25rem",
                }}
              >
                BREAKDOWN BY TYPE
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                }}
              >
                {Object.entries(summary.complaintsByType).map(([type, count]) => {
                  const pct = totalByType ? Math.round((count / totalByType) * 100) : 0;
                  return (
                    <div
                      key={type}
                      style={{
                        padding: "1rem",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        background: "var(--cream)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                          marginBottom: "0.4rem",
                        }}
                      >
                        {TYPE_LABELS[type] ?? type}
                      </p>
                      <p
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 800,
                          color: "var(--black)",
                          fontFamily: "var(--font-bebas), sans-serif",
                          letterSpacing: "-0.01em",
                          lineHeight: 1,
                        }}
                      >
                        {count.toLocaleString()}
                      </p>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                        {pct}% of total
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}