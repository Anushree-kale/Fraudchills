"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetchJson } from "@/lib/api";

type ComplaintRow = {
  id: string;
  caseNumber?: string;
  case_number?: string;
  details: string;
  amount: number;
  status: string;
  brandName?: string;
  brand_name?: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ active: 4, resolved: 11, atRisk: 84000, riskScore: 73 });
  const [complaints, setComplaints] = useState<ComplaintRow[]>([
    { id: "1", caseNumber: "#FC-2841", details: "Unauthorized charge — Flipkart seller", amount: 12400, status: "REVIEW" },
    { id: "2", caseNumber: "#FC-2839", details: "Fake product listing — Meesho", amount: 3200, status: "OPEN" },
    { id: "3", caseNumber: "#FC-2830", details: "Non-delivery of goods — Amazon", amount: 7899, status: "OPEN" },
    { id: "4", caseNumber: "#FC-2811", details: "Refund withheld — Myntra order", amount: 1499, status: "RESOLVED" },
  ]);
  const [loading, setLoading] = useState(false); // Using mock data to match UI exactly for now

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fdashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loading-text">
          <span className="pulsing-dot"></span>
          Loading...
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "ACTIVE CASES", value: stats.active, sub: "+1 this week", subColor: "text-[var(--success)]" },
    { label: "RESOLVED", value: stats.resolved, sub: "92% success rate", subColor: "text-[var(--success)]" },
    { label: "AMOUNT AT RISK", value: `₹${(stats.atRisk/1000).toFixed(0)}K`, sub: "2 flagged high priority", subColor: "text-[var(--danger)]", mono: true },
    { label: "RISK SCORE", value: stats.riskScore, sub: "ML detection score" },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-[10px] font-medium tracking-[3px] text-[var(--muted)] uppercase mb-2">
          CONSUMER PROTECTION DIVISION · CASE PORTAL
        </p>
        <h1 className="text-[54px] font-bebas text-[var(--black)] leading-[0.9]">
          MY DASHBOARD
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[14px]">
        {statCards.map((card, i) => (
          <div 
            key={i} 
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-6"
          >
            <p className="text-[10px] tracking-[2px] text-[var(--muted)] font-medium uppercase mb-3">
              {card.label}
            </p>
            <p className={`text-[42px] font-bebas text-[var(--gold)] leading-none mb-1 ${card.mono ? 'font-mono' : ''}`}>
              {loading ? "—" : card.value}
            </p>
            <p className={`text-[11px] font-medium ${card.subColor || 'text-[var(--muted)]'}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px]">
        {/* Left Col: Case Records Table & Button */}
        <div className="lg:col-span-2 flex flex-col gap-[14px]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
              <h2 className="text-[12px] font-bold tracking-[2px] text-[var(--black)] uppercase">
                ACTIVE CASE RECORDS
              </h2>
              <Link
                href="/complaints/new"
                className="text-[10px] font-bold tracking-[2px] text-[var(--gold)] uppercase hover:opacity-80 transition-opacity"
              >
                + FILE NEW
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="loading-text justify-center">
                          <span className="pulsing-dot"></span>
                          Loading records...
                        </div>
                      </td>
                    </tr>
                  ) : complaints.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-[13px] text-[var(--muted)]">
                        No active case records found.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c) => {
                       const caseId = c.caseNumber || c.case_number || "FC-XXXX";
                       const status = (c.status || "OPEN").toUpperCase();
                       let statusStyle = "bg-[#fcf3d7] text-[#c9a84c]"; // OPEN
                       if (status === "REVIEW") statusStyle = "bg-[#fbeaea] text-[#cb4e4e]";
                       if (status === "RESOLVED") statusStyle = "bg-[#eaf3eb] text-[#528e57]";

                       return (
                        <tr key={c.id} className="hover:bg-[rgba(0,0,0,0.01)] transition-colors">
                          <td className="pl-8 pr-4 py-5 text-[11px] font-mono text-[var(--muted)] whitespace-nowrap">{caseId}</td>
                          <td className="px-4 py-5 text-[13px] font-medium text-[var(--black)] truncate max-w-[280px]">{c.details}</td>
                          <td className="px-4 py-5 text-[12px] font-mono font-bold text-right text-[var(--black)]">₹{c.amount.toLocaleString()}</td>
                          <td className="pl-4 pr-8 py-5 text-right">
                            <span className={`inline-block text-[10px] tracking-[1px] font-bold px-[12px] py-[4px] rounded-[2px] ${statusStyle}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                       );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer */}
            <div className="px-8 py-6 bg-[var(--surface)]">
              <Link href="/complaints/new" className="inline-flex items-center justify-center bg-[var(--black)] text-[var(--cream)] px-8 py-3 text-[11px] font-bold tracking-[2px] uppercase transition-colors hover:bg-[#2A2A2A] rounded-[2px]">
                FILE NEW RECORD →
              </Link>
            </div>
          </div>
        </div>

        {/* Right Col: Extra Panels */}
        <div className="space-y-[14px]">
          {/* Fraud By Category */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-8">
            <h2 className="text-[12px] font-bold tracking-[2px] text-[var(--black)] uppercase mb-8">
              FRAUD BY CATEGORY
            </h2>
            <div className="space-y-5">
              {[
                { label: "Non-delivery", val: 78 },
                { label: "Fake seller", val: 61 },
                { label: "Unauth charge", val: 44 },
                { label: "Refund issue", val: 29 },
              ].map((item) => (
                <div key={item.label} className="flex items-center text-[12px]">
                  <span className="w-24 text-[var(--muted)] font-medium">{item.label}</span>
                  <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden mx-4">
                    <div className="h-full bg-[var(--gold)]" style={{ width: `${item.val}%` }} />
                  </div>
                  <span className="font-mono text-[var(--black)] font-bold">{item.val}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-8">
            <h2 className="text-[12px] font-bold tracking-[2px] text-[var(--black)] uppercase mb-8">
              RECENT ACTIVITY
            </h2>
            <div className="space-y-8">
              {[
                { time: "TODAY · 11:42 AM", msg: "#FC-2841 flagged for urgent review by ML engine", active: true },
                { time: "TODAY · 09:15 AM", msg: "#FC-2811 marked resolved — refund", active: false },
              ].map((evt, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center border ${evt.active ? 'border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]' : 'border-[var(--success)] bg-[#eaf3eb] text-[var(--success)]'}`}>
                       {evt.active ? (
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                       ) : (
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                       )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--black)] leading-[1.5] mb-1.5">{evt.msg}</p>
                    <p className="text-[9px] font-bold tracking-[1.5px] text-[var(--muted)] uppercase">{evt.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
