"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchBrands, type BrandSummary } from "@/lib/api";

function riskColor(score: number) {
  if (score >= 70) return { bg: "rgba(203,78,78,0.1)", color: "var(--danger)" };
  if (score >= 40) return { bg: "rgba(201,168,76,0.1)", color: "var(--gold)" };
  return { bg: "rgba(82,142,87,0.1)", color: "var(--success)" };
}

const PAGE_SIZE = 20;

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (resetSkip = false) => {
    const currentSkip = resetSkip ? 0 : skip;
    if (resetSkip) setLoading(true); else setLoadingMore(true);
    try {
      const data = await fetchBrands(currentSkip, PAGE_SIZE);
      if (resetSkip) {
        setBrands(data);
        setSkip(data.length);
      } else {
        setBrands((prev) => [...prev, ...data]);
        setSkip((s) => s + data.length);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      if (resetSkip) setBrands([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [skip]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = search.trim()
    ? brands.filter((b) =>
      b.brandName.toLowerCase().includes(search.trim().toLowerCase())
    )
    : brands;

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
          marginBottom: "1.75rem",
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
            ACCOUNTABILITY
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
            Brand Directory
          </h1>
        </div>
        <Link
          href="/brands/claim"
          style={{
            padding: "0.7rem 1.4rem",
            border: "1px solid var(--black)",
            background: "transparent",
            color: "var(--black)",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderRadius: 2,
          }}
        >
          CLAIM YOUR BRAND
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search brands…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 340,
            padding: "0.55rem 0.9rem",
            fontSize: "0.88rem",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--surface)",
            color: "var(--black)",
            outline: "none",
          }}
        />
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", padding: "3rem 0", textAlign: "center" }}>
          Loading brands…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--muted)", padding: "3rem 0", textAlign: "center" }}>
          No brands found.
        </div>
      ) : (
        <>
          {/* Table */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              marginBottom: "1.25rem",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Brand", "Complaints", "Avg Risk", "Risk Level", ""].map((h) => (
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
                {filtered.map((b, i) => {
                  const rc = riskColor(b.avgRiskScore);
                  return (
                    <tr
                      key={b.brandName}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.72rem",
                          color: "var(--muted)",
                          width: 40,
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontWeight: 700,
                          fontSize: "0.92rem",
                          color: "var(--black)",
                        }}
                      >
                        {b.brandName}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontSize: "0.85rem",
                          color: "var(--black)",
                          fontWeight: 600,
                        }}
                      >
                        {b.totalComplaints.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1.25rem",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.82rem",
                          color: rc.color,
                          fontWeight: 700,
                        }}
                      >
                        {b.avgRiskScore}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.55rem",
                            borderRadius: 99,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            background: rc.bg,
                            color: rc.color,
                          }}
                        >
                          {b.riskLabel}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <Link
                          href={`/brands/${encodeURIComponent(b.brandName)}`}
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--gold)",
                          }}
                        >
                          PROFILE →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && !search && (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => load(false)}
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
        </>
      )}
    </div>
  );
}