"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useInView } from "@/hooks/useInView";

function StatPill({
  label,
  target,
  suffix = "",
  active,
}: {
  label: string;
  target: number;
  suffix?: string;
  active: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else setN(target);
    };
    requestAnimationFrame(tick);
  }, [active, target]);

  const display = `${Math.round(n)}${suffix}`;

  return (
    <div className="stat-pill-interactive flex min-h-[6.75rem] flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--cream)] px-2 py-4 transition-[transform,box-shadow,border-color] duration-300 sm:min-h-[7.5rem] sm:px-3 sm:py-5 md:min-h-[8rem]">
      <span className="mb-1.5 text-[clamp(1.35rem,3.8vw,2.1rem)] font-bold leading-none text-[var(--gold)] sm:mb-2">
        {display}
      </span>
      <span className="px-0.5 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.12em] text-[var(--black)] sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </span>
    </div>
  );
}

export default function HeroSection() {
  const statsRef = useInView<HTMLDivElement>();
  const { data: session } = useSession();

  return (
    <section className="border-b border-[var(--border)] bg-[var(--cream)]" aria-labelledby="hero-heading">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--page-gutter)] pb-[clamp(2.5rem,8vw,5rem)] pt-[calc(var(--nav-offset)+clamp(1.25rem,4vw,2.25rem))]">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 xl:gap-16">
          <div className="min-w-0 flex-1 lg:max-w-[min(100%,32rem)] xl:max-w-[36rem]">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--black)] sm:mb-6 sm:tracking-[0.28em]">
              CASE FILED • CONSUMER PROTECTION DIVISION
            </p>

            <h1
              id="hero-heading"
              className="font-bebas text-[clamp(3rem,10vw,6.25rem)] leading-[0.9] tracking-[-0.02em] text-[var(--black)]"
            >
              FRAUDCHILLS
            </h1>

            <p className="mt-5 max-w-[38rem] text-[clamp(0.95rem,2.2vw,1.125rem)] leading-[1.65] text-[#444] sm:mt-6 md:text-lg md:leading-relaxed">
              Stop e-commerce fraud before it hits. Real-time ML detection with verified complaints,
              traceable timelines, and accountable resolution.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 sm:mt-9 sm:gap-4">
              <Link
                href={session ? "/complaints/new" : "/auth/signin?callbackUrl=%2Fcomplaints%2Fnew"}
                className="hero-cta-btn hero-cta-btn--primary inline-flex min-h-[2.75rem] min-w-[10rem] items-center justify-center bg-black px-8 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-[transform,box-shadow,background-color] duration-300 hover:bg-[#222] active:scale-[0.98] sm:min-h-[3rem] sm:px-10 sm:text-[11px]"
              >
                REPORT NOW
              </Link>
              <Link
                href="/analytics"
                className="hero-cta-btn inline-flex min-h-[2.75rem] items-center justify-center gap-2 border border-black bg-transparent px-8 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-black transition-[transform,box-shadow,background-color] duration-300 hover:bg-[var(--surface)] active:scale-[0.98] sm:min-h-[3rem] sm:px-10 sm:text-[11px]"
              >
                FRAUD ANALYTICS
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
              </Link>
            </div>

            <div
              className="mt-9 grid w-full max-w-[28rem] grid-cols-3 gap-2.5 sm:mt-11 sm:max-w-[32rem] sm:gap-3 md:gap-4 lg:max-w-[36rem]"
              ref={statsRef.ref}
            >
              <StatPill label="COMPLAINTS" target={10} suffix="K+" active={statsRef.inView} />
              <StatPill label="RESOLUTION" target={92} suffix="%" active={statsRef.inView} />
              <StatPill label="FRAUD DETECTION" target={95} suffix="%" active={statsRef.inView} />
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-[min(44%,26rem)] xl:w-[min(46%,28rem)]">
            <div className="hero-visual-frame group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_24px_rgba(15,15,15,0.06)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,15,15,0.12)]">
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src="/images/hero-visual.png"
                  alt="Fraud detection — shield and verification graphic"
                  className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  priority
                />
              </div>
            </div>
            <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] lg:mt-4 lg:text-left">
              Securing legal integrity
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
