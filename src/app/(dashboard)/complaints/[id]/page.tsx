"use client";

import React from "react";
import { 
  ArrowLeft, 
  ExternalLink, 
  MoreVertical, 
  ShieldAlert, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Building2,
  Trash2,
  MessageSquare
} from "lucide-react";
import Link from "next/link";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  // Mock case data (In a real app, fetch from API)
  const caseData = {
    id: params.id || "FC-1240",
    type: "SELLER_FRAUD",
    status: "PENDING",
    platform: "Amazon",
    amount: 1200,
    brand: "FakeStore Pro",
    score: 82,
    date: "2024-04-04 14:10",
    details: "Purchased a mechanical keyboard. Received a set of plastic bricks instead. Seller is not responding to emails and has blocked me on WhatsApp.",
    events: [
      { type: "FILED", note: "Complaint filed by user.", date: "2024-04-04 14:10", color: "var(--accent-gold)" },
      { type: "AI_ANALYSIS", note: "High risk characteristics detected (Amount > 1000, Platform recidivism).", date: "2024-04-04 14:11", color: "#1971C2" },
      { type: "SLA_SET", note: "Brand response deadline set for 2024-04-11.", date: "2024-04-04 14:11", color: "#666" },
    ]
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "#E03131"; // High
    if (score >= 40) return "#F08C00"; // Medium
    return "#2B8A3E"; // Low
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-ink-muted hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-ink uppercase tracking-tight">{caseData.id}</h1>
              <span className={`status-pill status-${caseData.status.toLowerCase()}`}>
                {caseData.status}
              </span>
            </div>
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ">Filed on {caseData.date}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-outline !py-2 !px-4 !text-[10px] !rounded-full flex items-center gap-2">
            <MessageSquare size={14} />
            Add Note
          </button>
          <button className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-ink-muted hover:text-red-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Evidence */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-black/5">
            <h3 className="text-sm font-black uppercase text-ink mb-6 border-b border-black/5 pb-4">Incident Details</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase text-ink-muted mb-1">Type</p>
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-red-500" />
                  <p className="text-sm font-bold text-ink uppercase">{caseData.type.replace('_', ' ')}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-muted mb-1">Platform</p>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-ink-muted" />
                  <p className="text-sm font-bold text-ink">{caseData.platform}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-ink-muted mb-1">Impacted Amount</p>
                <p className="text-sm font-bold text-ink">₹{caseData.amount}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-ink-muted">Description</p>
              <div className="bg-surface p-6 rounded-2xl text-sm leading-relaxed text-ink/80 border border-black/5">
                {caseData.details}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-[10px] font-black uppercase text-ink-muted mb-4">Evidence Gallery (0)</p>
              <div className="flex items-center justify-center p-12 bg-surface/50 rounded-2xl border-2 border-dashed border-black/5">
                <div className="text-center">
                  <FileText className="mx-auto text-ink-muted mb-2" size={24} />
                  <p className="text-[11px] font-medium text-ink-muted uppercase">No evidence attached yet</p>
                  <button className="text-[10px] font-black uppercase text-accent-gold mt-2 hover:underline">+ Upload Now</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-black/5">
            <h3 className="text-sm font-black uppercase text-ink mb-8 border-b border-black/5 pb-4">Case Timeline</h3>
            <div className="space-y-8 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-black/5">
              {caseData.events.map((event, i) => (
                <div key={i} className="pl-10 relative">
                  <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full border-2 border-white bg-surface flex items-center justify-center">
                    <div className="w-full h-full rounded-full" style={{background: event.color}}></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-black text-ink uppercase tracking-tight">{event.type}</p>
                      <p className="text-[10px] text-ink-muted font-mono">{event.date}</p>
                    </div>
                    <p className="text-xs text-ink-muted">{event.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Risk Ring & Status */}
        <div className="space-y-8">
          <div className="bg-ink p-8 rounded-3xl text-cream overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-8">ML Risk Intelligence</p>
              
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    fill="none"
                    stroke={getRiskColor(caseData.score)}
                    strokeWidth="12"
                    strokeDasharray={527.7}
                    strokeDashoffset={527.7 - (527.7 * caseData.score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black" style={{color: getRiskColor(caseData.score)}}>{caseData.score}</span>
                  <span className="text-[10px] font-bold text-white/50 uppercase mt-1">Risk Pct</span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 mb-4">
                  <ShieldAlert size={12} style={{color: getRiskColor(caseData.score)}} />
                  <span className="text-[10px] font-black uppercase" style={{color: getRiskColor(caseData.score)}}>High Risk Detected</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed max-w-[200px] mx-auto">
                  Incident shows pattern of systematic fraud linked to 12 other reports this week.
                </p>
              </div>
            </div>
            
            {/* Background noise/texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <filter id="noise">
                  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                </filter>
                <rect width="100%" height="100%" filter="url(#noise)" />
              </svg>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-black/5">
            <h4 className="text-[10px] font-black uppercase text-ink-muted mb-6 tracking-wider">Case Actions</h4>
            <div className="space-y-3">
              <button className="w-full btn-black !rounded-xl !py-4 flex items-center justify-center gap-3">
                <CheckCircle2 size={16} />
                Mark as Resolved
              </button>
              <button className="w-full btn-outline !rounded-xl !py-4 flex items-center justify-center gap-3 border-orange-200 text-orange-700 bg-orange-50/30">
                <AlertTriangle size={16} />
                Escalate to Agency
              </button>
            </div>
            <p className="text-[10px] text-center text-ink-muted mt-6 uppercase font-bold">
              Expires in <span className="text-red-500">6 Days 14h</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
