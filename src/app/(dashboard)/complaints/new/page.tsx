"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertCircle,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { apiFetchJson } from "@/lib/api";

export default function NewComplaintPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "BUYER_FRAUD",
    brandName: "",
    platform: "",
    orderId: "",
    amount: "",
    details: "",
    proofUrls: [] as string[],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fcomplaints%2Fnew");
    }
  }, [status, router]);

  // Simulate AI calculation when reaching step 3
  useEffect(() => {
    if (step === 3) {
      setIsCalculating(true);
      const timer = setTimeout(() => setIsCalculating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

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

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!session?.user?.email) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        type: formData.type.toUpperCase(),
        details: formData.details,
        platform: formData.platform,
        orderId: formData.orderId,
        amount: parseFloat(formData.amount) || 0,
        brandName: formData.brandName,
        proofUrls: formData.proofUrls,
        imageUrl: formData.proofUrls[0] || null, // Map first proof to image_url fix
      };

      await apiFetchJson("/complaints", session.user.email, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push("/dashboard?success=true");
    } catch (err: any) {
      setError(err.message || "Failed to file case. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { n: 1, label: "01 — INCIDENT DETAILS" },
    { n: 2, label: "02 — UPLOAD EVIDENCE" },
    { n: 3, label: "03 — REVIEW & SUBMIT" },
  ];

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Header Stepper */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-[14px] left-0 w-full h-[1px] bg-[var(--border)] -z-10" />
        {steps.map((s, i) => {
          const isCompleted = step > s.n;
          const isActive = step === s.n;
          const showLine = i < steps.length - 1;

          return (
            <div key={s.n} className="flex flex-col items-center gap-3 bg-[var(--cream)] px-4">
              <div
                className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors border ${
                  isCompleted
                    ? "bg-[var(--black)] border-[var(--black)] text-white"
                    : isActive
                    ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--black)]"
                    : "bg-[var(--cream)] border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {isCompleted ? <Check size={16} /> : <span className="text-[12px] font-medium">{s.n}</span>}
              </div>
              <span
                className={`text-[10px] tracking-[1px] font-medium transition-colors ${
                  isActive ? "text-[var(--black)]" : "text-[var(--muted)]"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] p-8 md:p-10">
        {error && (
          <div className="mb-6 p-4 bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] border-opacity-20 rounded-[4px] flex items-start gap-3 text-[var(--danger)]">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-[12px]">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="text-[10px] tracking-[2px] uppercase text-[var(--muted)] block mb-2">
                Brand Name
              </label>
              <input
                type="text"
                placeholder="Target brand or company"
                className="w-full bg-[var(--cream)] border border-[var(--border)] rounded-[4px] py-[10px] px-[14px] text-[14px] outline-none focus:border-[var(--gold)] transition-colors"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[2px] uppercase text-[var(--muted)] block mb-2">
                Fraud Type
              </label>
              <select
                className="w-full bg-[var(--cream)] border border-[var(--border)] rounded-[4px] py-[10px] px-[14px] text-[14px] outline-none focus:border-[var(--gold)] transition-colors appearance-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="BUYER_FRAUD">Buyer Fraud</option>
                <option value="SELLER_FRAUD">Seller Fraud</option>
                <option value="UNAUTHORIZED_CHARGE">Unauthorized Charge</option>
                <option value="PHISHING">Phishing / malicious link</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] tracking-[2px] uppercase text-[var(--muted)] block mb-2">
                  Platform
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon, Instagram"
                  className="w-full bg-[var(--cream)] border border-[var(--border)] rounded-[4px] py-[10px] px-[14px] text-[14px] outline-none focus:border-[var(--gold)] transition-colors"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] tracking-[2px] uppercase text-[var(--muted)] block mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-[var(--cream)] border border-[var(--border)] rounded-[4px] py-[10px] px-[14px] text-[14px] outline-none focus:border-[var(--gold)] transition-colors"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] tracking-[2px] uppercase text-[var(--muted)] block mb-2">
                Detailed Incident Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe exactly what happened..."
                className="w-full bg-[var(--cream)] border border-[var(--border)] rounded-[4px] py-[10px] px-[14px] text-[14px] outline-none focus:border-[var(--gold)] transition-colors resize-none"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              ></textarea>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border border-dashed border-[var(--border)] rounded-[4px] p-12 flex flex-col items-center justify-center text-center">
              <Upload size={32} className="text-[var(--muted)] mb-4" />
              <h3 className="text-[16px] font-medium mb-2 uppercase tracking-[1px]">Upload Evidence</h3>
              <p className="text-[12px] text-[var(--muted)] max-w-[280px] mb-6">
                Attach screenshots of chats, payment receipts, or products to increase your trust score.
              </p>
              <button className="bg-[var(--black)] text-[var(--cream)] text-[10px] tracking-[2px] px-6 py-3 rounded-[4px] hover:opacity-85 transition-opacity">
                SELECT FILES
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="aspect-video bg-[var(--cream)] border border-[var(--border)] rounded-[4px] flex items-center justify-center text-[var(--muted)] text-[11px] uppercase tracking-[1px]">
                  No files selected
               </div>
               <div className="aspect-video bg-[var(--cream)] border border-[var(--border)] rounded-[4px] flex items-center justify-center text-[var(--muted)] text-[11px] uppercase tracking-[1px]">
                  No files selected
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Warning Notice */}
            <div className="bg-[rgba(201,76,76,0.08)] border border-[rgba(201,76,76,0.2)] rounded-[4px] p-4 flex gap-3 text-[var(--danger)]">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed">
                Filing a false report is a criminal offense. Please ensure all details and evidence provided are 100% accurate.
              </p>
            </div>

            {/* Field Review */}
            <div className="space-y-4">
              {[
                { label: "BRAND NAME", value: formData.brandName },
                { label: "INCIDENT TYPE", value: formData.type.replace("_", " ") },
                { label: "PLATFORM", value: formData.platform || "NOT SPECIFIED" },
                { label: "AMOUNT", value: `₹${formData.amount || "0.00"}` },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                  <span className="text-[10px] tracking-[2px] text-[var(--muted)] font-medium">
                    {row.label}
                  </span>
                  <span className="text-[13px] font-mono text-[var(--black)]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* AI Risk Analysis */}
            <div className="bg-[var(--cream)] border border-[var(--border)] rounded-[4px] p-6 relative overflow-hidden">
               <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={16} className="text-[var(--gold)]" />
                  <span className="text-[9px] tracking-[2px] font-bold text-[var(--gold)] uppercase">
                    AI INITIAL RISK ANALYSIS
                  </span>
               </div>
               <div className="flex items-end gap-3">
                  {isCalculating ? (
                    <div className="flex items-center gap-2 h-[48px]">
                       <span className="pulsing-dot"></span>
                    </div>
                  ) : (
                    <span className="text-[48px] font-bebas text-[var(--gold)] leading-none">
                      74.2
                    </span>
                  )}
                  <div className="mb-2">
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed italic">
                      Based on current datasets, this brand shows patterns of recurrent logistical failure.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--black)] transition-colors text-[10px] font-bold tracking-[2px] uppercase"
            >
              <ArrowLeft size={16} />
              BACK
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="bg-[var(--black)] text-[var(--cream)] text-[10px] tracking-[3px] font-bold py-4 px-10 rounded-[4px] hover:opacity-85 transition-opacity"
            >
              CONTINUE
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 bg-[var(--black)] text-[var(--cream)] text-[11px] tracking-[3px] font-bold py-4 px-10 rounded-[4px] transition-all ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:opacity-85"
              }`}
            >
              {isSubmitting ? "FILING CASE..." : "FILE CASE"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
