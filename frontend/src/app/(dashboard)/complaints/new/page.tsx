"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertCircle,
  Check,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { createComplaint, predictFraud, uploadFile, type FraudPredictResult } from "@/lib/api";

export default function NewComplaintPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewRisk, setPreviewRisk] = useState<FraudPredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (step !== 3 || !session?.user?.email) {
      setPreviewRisk(null);
      return;
    }
    let cancelled = false;
    setIsCalculating(true);
    setPreviewRisk(null);
    (async () => {
      try {
        const r = await predictFraud(session.user!.email!, {
          amount: parseFloat(formData.amount) || 0,
        });
        if (!cancelled) setPreviewRisk(r);
      } catch {
        if (!cancelled) setPreviewRisk(null);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, session?.user?.email, formData.amount]);

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

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!formData.brandName.trim()) {
        setError("Add a brand name to continue.");
        return;
      }
      if (!formData.details.trim()) {
        setError("Add a short description to continue.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!session?.user?.email) return;
    if (!formData.brandName.trim()) {
      setError("Please enter a brand name.");
      return;
    }
    if (!formData.details.trim()) {
      setError("Please describe what happened.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await createComplaint(
        {
          type: formData.type.toUpperCase(),
          details: formData.details.trim(),
          platform: formData.platform.trim() || undefined,
          orderId: formData.orderId.trim() || undefined,
          amount: parseFloat(formData.amount) || 0,
          brandName: formData.brandName.trim(),
          proofUrls: formData.proofUrls,
          imageUrl: formData.proofUrls[0] || undefined,
        },
        session.user.email
      );

      router.push("/dashboard?success=true");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to file case. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { n: 1, label: "01 — INCIDENT DETAILS" },
    { n: 2, label: "02 — UPLOAD EVIDENCE" },
    { n: 3, label: "03 — REVIEW & SUBMIT" },
  ];

  const inputClass =
    "min-h-[44px] w-full rounded-[4px] border border-[var(--border)] bg-[var(--cream)] px-[14px] py-2.5 text-[16px] leading-snug outline-none transition-colors focus:border-[var(--gold)] sm:text-[15px]";

  return (
    <div className="mx-auto w-full max-w-[min(40rem,100%)] px-0 pb-[max(6rem,env(safe-area-inset-bottom))] md:pb-10">
      {/* Header Stepper */}
      <div className="relative mb-8 flex flex-wrap items-start justify-between gap-4 md:mb-12">
        <div className="absolute left-0 top-[14px] -z-10 hidden h-px w-full bg-[var(--border)] md:block" />
        {steps.map((s, i) => {
          const isCompleted = step > s.n;
          const isActive = step === s.n;

          return (
            <div key={s.n} className="flex flex-col items-center gap-2 bg-[var(--cream)] px-2 md:gap-3 md:px-4">
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
                className={`max-w-[6.5rem] text-center text-[9px] font-medium tracking-wide transition-colors sm:max-w-none sm:text-[10px] sm:tracking-[1px] ${
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
      <div className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8 md:p-10">
        {error && (
          <div className="mb-6 p-4 bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] border-opacity-20 rounded-[4px] flex items-start gap-3 text-[var(--danger)]">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-[12px]">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Brand name
              </label>
              <input
                type="text"
                placeholder="Target brand or company"
                className={inputClass}
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Fraud type
              </label>
              <select
                className={`${inputClass} appearance-none`}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="BUYER_FRAUD">Buyer Fraud</option>
                <option value="SELLER_FRAUD">Seller Fraud</option>
                <option value="UNAUTHORIZED_CHARGE">Unauthorized Charge</option>
                <option value="PHISHING">Phishing / malicious link</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Order ID (optional)
              </label>
              <input
                type="text"
                placeholder="Order or reference number"
                className={inputClass}
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Platform
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon, Instagram"
                  className={inputClass}
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={inputClass}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Detailed incident description
              </label>
              <textarea
                rows={5}
                placeholder="Describe exactly what happened..."
                className={`${inputClass} min-h-[120px] resize-y`}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300 md:space-y-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.mp4"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length || !session?.user?.email) return;
                setError(null);
                try {
                  const urls: string[] = [];
                  for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    const { fileUrl } = await uploadFile(f, session.user.email);
                    urls.push(fileUrl);
                  }
                  setFormData((prev) => ({
                    ...prev,
                    proofUrls: [...prev.proofUrls, ...urls],
                  }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed.");
                }
                e.target.value = "";
              }}
            />
            <div className="flex flex-col items-center justify-center rounded-[4px] border border-dashed border-[var(--border)] p-8 text-center sm:p-12">
              <Upload size={32} className="mb-4 text-[var(--muted)]" aria-hidden />
              <h3 className="mb-2 text-[15px] font-medium uppercase tracking-wide">Upload evidence</h3>
              <p className="mb-6 max-w-[320px] text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]">
                Screenshots, receipts, or product photos (optional). Files are sent to your configured API.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] rounded-[4px] bg-[var(--black)] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--cream)] transition-opacity hover:opacity-85"
              >
                Select files
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {formData.proofUrls.length === 0 ? (
                <div className="flex min-h-[100px] items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--cream)] px-3 text-center text-[12px] uppercase tracking-wide text-[var(--muted)] sm:col-span-2">
                  No files yet — add some or continue.
                </div>
              ) : (
                formData.proofUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="flex min-h-[100px] flex-col justify-center break-all rounded-[4px] border border-[var(--border)] bg-[var(--cream)] p-3 text-[12px] text-[var(--black)]"
                  >
                    <span className="mb-2 line-clamp-2 text-[var(--muted)]">File {idx + 1}</span>
                    <a href={url} target="_blank" rel="noreferrer" className="text-[var(--gold)] underline">
                      Open link
                    </a>
                  </div>
                ))
              )}
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
            <div className="relative overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--cream)] p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--gold)]" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                  Transaction risk preview (API)
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                {isCalculating ? (
                  <div className="flex h-14 items-center gap-2">
                    <span className="pulsing-dot" />
                    <span className="text-[14px] text-[var(--muted)]">Calling /predict-fraud…</span>
                  </div>
                ) : previewRisk ? (
                  <>
                    <span className="font-bebas text-[clamp(2.5rem,10vw,3.5rem)] leading-none text-[var(--gold)]">
                      {(Math.min(1, Math.max(0, previewRisk.riskScore)) * 100).toFixed(1)}
                      <span className="text-[0.45em] text-[var(--muted)]">%</span>
                    </span>
                    <div className="min-w-0 flex-1 pb-0 sm:pb-1">
                      <p className="text-[13px] leading-relaxed text-[var(--black)] sm:text-[14px]">
                        {previewRisk.flagged ? "Elevated — review before submitting." : "Within typical range for this amount."}
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{previewRisk.reason}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[14px] text-[var(--muted)]">
                    Risk preview unavailable (check that the API is running). You can still file your case.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-8 md:mt-12">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex min-h-[44px] items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] transition-colors hover:text-[var(--black)]"
            >
              <ArrowLeft size={16} aria-hidden />
              Back
            </button>
          ) : (
            <div className="min-h-[44px] w-px shrink-0 sm:w-0" aria-hidden />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="min-h-[48px] rounded-[4px] bg-[var(--black)] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--cream)] transition-opacity hover:opacity-85 sm:px-10"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`min-h-[48px] flex-1 rounded-[4px] bg-[var(--black)] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--cream)] transition-all sm:min-w-[12rem] sm:flex-none sm:px-10 ${
                isSubmitting ? "cursor-not-allowed opacity-50" : "hover:opacity-85"
              }`}
            >
              {isSubmitting ? "Filing case…" : "File case"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
