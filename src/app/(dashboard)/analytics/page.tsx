"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  PieChart as PieIcon,
  Activity,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  apiFetchJson,
  apiFetchPublic,
  normalizeAnalyticsSummary,
  normalizeTrends,
  normalizeTopBrands,
  normalizeMlHealth,
} from "@/lib/api";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<ReturnType<typeof normalizeAnalyticsSummary> | null>(null);
  const [trends, setTrends] = useState<ReturnType<typeof normalizeTrends>>([]);
  const [topBrands, setTopBrands] = useState<ReturnType<typeof normalizeTopBrands>>([]);
  const [mlStatus, setMlStatus] = useState<ReturnType<typeof normalizeMlHealth> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.email) return;
    setError(null);
    setLoading(true);
    try {
      const [s, t, b, m] = await Promise.all([
        apiFetchJson<Record<string, unknown>>("/analytics/summary", session.user.email),
        apiFetchJson<unknown[]>("/analytics/trends", session.user.email),
        apiFetchJson<unknown[]>("/analytics/top-brands", session.user.email),
        apiFetchPublic<Record<string, unknown>>("/analytics/health").catch(() => ({
          modelLoaded: false,
          datasetRows: 0,
          featureColumns: [],
        })),
      ]);
      setSummary(normalizeAnalyticsSummary(s));
      setTrends(normalizeTrends(t));
      setTopBrands(normalizeTopBrands(b));
      setMlStatus(normalizeMlHealth(m));
    } catch (e: any) {
      setError(e.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fanalytics");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="py-20 flex justify-center">
        <div className="loading-text">
          <span className="pulsing-dot"></span>
          Loading...
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "TOTAL COMPLAINTS", value: summary?.totalComplaints ?? 0, sub: "All-time platform signals" },
    { label: "RESOLUTION RATE", value: `${summary?.resolutionRate.toFixed(1) ?? 0}%`, sub: "Cases closed / Total" },
    { label: "AVG RISK SCORE", value: summary?.avgRiskScore.toFixed(1) ?? 0, sub: "Platform-wide average" },
    { label: "HIGH RISK CASES", value: summary?.highRiskCount ?? 0, sub: "Score ≥ 70" },
  ];

  const pieData = summary ? Object.entries(summary.complaintsByType).map(([name, value]) => ({
    name: name.replace("_", " "),
    value
  })) : [];

  const COLORS = ['#C9A84C', '#0E0E0E', '#7A7A72', '#C94C4C'];

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="text-[10px] font-medium tracking-[3px] text-[var(--muted)] uppercase mb-1">
            INTERNAL INTELLIGENCE · DATA ENGINE
          </p>
          <h1 className="text-[42px] font-bebas text-[var(--black)] leading-none">
            FRAUD ANALYTICS
          </h1>
        </div>

        {/* ML Status Badge */}
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-bold tracking-[1px] uppercase border ${
          mlStatus?.modelLoaded 
            ? "bg-[rgba(90,158,96,0.1)] border-[rgba(90,158,96,0.2)] text-[var(--success)]" 
            : "bg-[rgba(201,76,76,0.1)] border-[rgba(201,76,76,0.2)] text-[var(--danger)]"
        }`}>
          <div className={`w-[6px] h-[6px] rounded-full ${mlStatus?.modelLoaded ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`} />
          {mlStatus?.modelLoaded ? "ML ACTIVE" : "ML OFFLINE"}
        </div>
      </div>

      {error ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-12 flex flex-col items-center justify-center text-center space-y-4">
           <AlertCircle size={32} className="text-[var(--danger)]" />
           <p className="text-[14px] text-[var(--black)] font-medium">Unable to load analytics</p>
           <button 
             onClick={load}
             className="text-[10px] font-bold tracking-[2px] text-[var(--gold)] uppercase border border-[var(--gold)] px-6 py-2 rounded-[4px] hover:bg-[var(--gold)] hover:text-[var(--black)] transition-all"
           >
             RETRY
           </button>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[14px]">
            {statCards.map((card, i) => (
              <div 
                key={i} 
                className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-[18px] px-[20px]"
              >
                <p className="text-[10px] tracking-[2px] text-[var(--muted)] font-medium uppercase mb-2">
                  {card.label}
                </p>
                <p className="text-[38px] font-bebas text-[var(--gold)] leading-none mb-1">
                  {loading ? "—" : card.value}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-6 space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <BarChart3 size={16} className="text-[var(--black)]" />
                     <h3 className="text-[12px] font-bold tracking-[2px] uppercase">Complaints Over Time</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--muted)]">
                     <span className="text-[var(--black)] cursor-pointer">MONTHLY</span>
                     <span className="opacity-40">WEEKLY</span>
                  </div>
               </div>
               <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="periodLabel" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'var(--muted)', fontWeight: 500 }}
                        tickFormatter={(val) => val.split("-").slice(1).join("-")} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'var(--muted)', fontWeight: 500 }} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: 4, border: '1px solid var(--border)', background: 'var(--cream)', fontSize: 11 }}
                      />
                      <Bar dataKey="count" fill="var(--black)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-6 space-y-6">
               <div className="flex items-center gap-2">
                  <PieIcon size={16} className="text-[var(--black)]" />
                  <h3 className="text-[12px] font-bold tracking-[2px] uppercase">Fraud By Category</h3>
               </div>
               <div className="h-[240px] w-full flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-[12px] text-[var(--muted)]">No distribution data available.</div>
                  )}
               </div>
            </div>
          </div>

          {/* Top Brands Table */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] overflow-hidden">
             <div className="px-6 py-5 border-b border-[var(--border)]">
                <h3 className="text-[12px] font-bold tracking-[2px] uppercase text-[var(--black)]">Top Fraudulent Brands</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-[var(--border)] font-medium text-[10px] tracking-[2px] text-[var(--muted)] uppercase">
                         <th className="px-6 py-4">RANK</th>
                         <th className="px-6 py-4">BRAND NAME</th>
                         <th className="px-6 py-4">COMPLAINT COUNT</th>
                         <th className="px-6 py-4">AVG SCORE</th>
                         <th className="px-6 py-4 text-right">RESOLVED %</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--border)]">
                      {topBrands.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-10 text-center text-[12px] text-[var(--muted)]">No brand rankings available.</td></tr>
                      ) : (
                        topBrands.map((brand, i) => {
                           const resolvedPct = brand.count > 0 ? (brand.resolvedCount / brand.count) * 100 : 0;
                           const scoreColor = brand.avgScore >= 60 ? "text-[var(--danger)]" : brand.avgScore >= 35 ? "text-[var(--gold)]" : "text-[var(--success)]";
                           
                           return (
                              <tr key={i} className="hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                                 <td className="px-6 py-4 font-mono text-[11px] text-[var(--muted)]">#{i + 1}</td>
                                 <td className="px-6 py-4 text-[13px] font-medium text-[var(--black)]">{brand.brandName}</td>
                                 <td className="px-6 py-4 text-[12px] text-[var(--black)]">{brand.count}</td>
                                 <td className={`px-6 py-4 text-[12px] font-bold ${scoreColor}`}>{brand.avgScore.toFixed(1)}</td>
                                 <td className="px-6 py-4 text-[12px] text-right font-mono text-[var(--black)]">{resolvedPct.toFixed(1)}%</td>
                              </tr>
                           );
                        })
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
