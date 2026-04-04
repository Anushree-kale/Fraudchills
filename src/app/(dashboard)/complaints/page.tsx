"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, ChevronUp, Clock } from "lucide-react";
import { apiFetchJson, apiFetchPublic } from "@/lib/api";

type Complaint = {
  id: string;
  type: string;
  details: string;
  status: string;
  brandName: string;
  score: number;
  upvotesCount: number;
  createdAt: string;
};

export default function ComplaintsPage() {
  const { data: session } = useSession();
  const [q, setQ] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [trending, setTrending] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());

      const [feedData, trendingData] = await Promise.all([
        apiFetchPublic<Complaint[]>(`/complaints?${params.toString()}`),
        apiFetchPublic<Complaint[]>("/complaints/trending"),
      ]);

      setComplaints(feedData);
      setTrending(trendingData);
    } catch (e: any) {
      setError(e.message || "Failed to load complaints repository.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeed();
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const upvote = async (complaintId: string) => {
    if (!session?.user?.email) {
      setError("AUTHENTICATION REQUIRED FOR VOTING.");
      return;
    }
    try {
      await apiFetchJson(`/complaints/${complaintId}/upvote`, session.user.email, {
        method: "POST",
      });
      loadFeed();
    } catch (e: any) {
      setError(e.message || "UPVOTE FAILED.");
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-[10px] font-medium tracking-[3px] text-[var(--muted)] uppercase mb-1">
          PUBLIC FRAUD RECORD
        </p>
        <h1 className="text-[42px] font-bebas text-[var(--black)] leading-none">
          COMPLAINTS
        </h1>
      </div>

      {/* Search Bar Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-5 flex items-center gap-4">
        <Search size={18} className="text-[var(--muted)]" />
        <input
          type="text"
          className="flex-1 bg-transparent border-none outline-none text-[13px] italic text-[var(--black)] placeholder:text-[var(--muted)]"
          placeholder="Search cases, brands, keywords..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-4 bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] border-opacity-20 rounded-[4px] text-[var(--danger)] text-[12px] uppercase tracking-[1px] font-bold">
          {error}
        </div>
      )}

      {/* Trending Section */}
      <section>
        <h2 className="text-[10px] font-bold tracking-[2px] text-[var(--muted)] uppercase mb-4">
          TRENDING DISPUTES
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {trending.map((c) => (
            <div
              key={c.id}
              className="min-w-[200px] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-4 flex flex-col gap-2"
            >
              <span className="text-[13px] font-bold text-[var(--black)] truncate">
                {c.brandName}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-mono text-[var(--gold)]">
                  {c.upvotesCount} VOTES
                </span>
                <button 
                  onClick={() => upvote(c.id)}
                  className="w-6 h-6 rounded-full bg-[var(--gold-dim)] flex items-center justify-center text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--black)] transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            </div>
          ))}
          {!trending.length && !loading && (
             <div className="text-[12px] text-[var(--muted)] italic">No trending data available.</div>
          )}
        </div>
      </section>

      {/* Main Feed */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold tracking-[2px] text-[var(--muted)] uppercase mb-4">
          ALL RECORDS
        </h2>
        
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="loading-text">
              <span className="pulsing-dot"></span>
              Loading feed...
            </div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-[var(--surface)] p-20 rounded-[4px] border border-[var(--border)] text-center text-[var(--muted)] text-[13px]">
            No records found for your current search criteria.
          </div>
        ) : (
          complaints.map((c) => {
            const status = (c.status || "OPEN").toUpperCase();
            let statusStyle = "bg-[rgba(201,168,76,0.12)] text-[#8a6a1a]";
            if (status === "REVIEW" || status === "PENDING") statusStyle = "bg-[rgba(201,76,76,0.1)] text-[#8a2a2a]";
            if (status === "RESOLVED") statusStyle = "bg-[rgba(90,158,96,0.1)] text-[#3a7040]";

            const scoreColor = c.score >= 70 ? "bg-[var(--danger)]" : c.score >= 40 ? "bg-[var(--gold)]" : "bg-[var(--success)]";

            return (
              <div key={c.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[15px] font-medium text-[var(--black)]">
                    {c.brandName}
                  </h3>
                  <span className={`text-[10px] tracking-[1px] font-medium px-[10px] py-[3px] rounded-[2px] ${statusStyle}`}>
                    {status}
                  </span>
                </div>

                <p className="text-[13px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                  {c.details}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] tracking-[1px] font-bold border border-[var(--border)] bg-[var(--cream)] px-3 py-1 rounded-[2px] text-[var(--muted)] uppercase">
                      {c.type.replace("_", " ")}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-[6px] h-[6px] rounded-full ${scoreColor}`} />
                      <span className="text-[12px] font-mono font-bold text-[var(--black)]">
                        {c.score.toFixed(0)}
                      </span>
                    </div>

                    <span className="text-[11px] text-[var(--muted)] uppercase flex items-center gap-1">
                       <Clock size={12} />
                       {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => upvote(c.id)}
                      className="flex items-center gap-2 text-[11px] font-bold tracking-[1px] text-[var(--black)] bg-[var(--gold-dim)] px-4 py-2 rounded-[2px] hover:bg-[var(--gold)] transition-colors"
                    >
                      <ChevronUp size={14} />
                      {c.upvotesCount}
                    </button>
                    <Link 
                      href={`/complaints/${c.id}`}
                      className="text-[11px] font-bold tracking-[1px] text-[var(--muted)] hover:text-[var(--black)] transition-colors underline"
                    >
                      SLA & TIMELINE
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
