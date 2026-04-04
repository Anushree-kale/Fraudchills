"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

function useInView<T extends HTMLElement>(options: IntersectionObserverInit = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true);
    }, { threshold: 0.2, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return { ref, inView };
}

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
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--cream)] px-3 py-5 transition-colors hover:border-[var(--gold)] sm:min-h-[132px] sm:px-4 sm:py-6">
      <span className="mb-2 text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-none text-[var(--gold)]">
        {display}
      </span>
      <span className="text-center text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--black)] sm:text-[10px] sm:tracking-[2px]">
        {label}
      </span>
    </div>
  );
}

export default function HeroSection() {
  const statsRef = useInView<HTMLDivElement>();
  const { data: session } = useSession();

  return (
    <section
      className="border-b border-[var(--border)] bg-[var(--cream)]"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-[88px] sm:px-8 md:pb-24 lg:pb-28">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 xl:gap-14">
          {/* Left: copy, CTAs, stats — normal document flow */}
          <div className="min-w-0 flex-1 lg:max-w-[min(100%,520px)] xl:max-w-[540px]">
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--black)] sm:mb-8 sm:tracking-[4px]">
              CASE FILED • CONSUMER PROTECTION DIVISION
            </p>

            <h1
              id="hero-heading"
              className="font-bebas text-[clamp(3.25rem,11vw,6.75rem)] leading-[0.88] tracking-[-0.02em] text-[var(--black)] sm:text-[clamp(3.5rem,9vw,7rem)]"
            >
              FRAUDCHILLS
            </h1>

            <p className="mt-6 max-w-[38rem] text-base leading-relaxed text-[#444] sm:mt-8 sm:text-[17px] md:text-lg">
              Stop e-commerce fraud before it hits. Real-time ML detection with verified complaints,
              traceable timelines, and accountable resolution.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">
              <Link
                href={session ? "/complaints/new" : "/auth/signin?callbackUrl=%2Fcomplaints%2Fnew"}
                className="inline-flex items-center justify-center bg-black px-8 py-4 text-[10px] font-bold uppercase tracking-[2px] text-white transition-colors hover:bg-[#222] sm:px-10 sm:py-5 sm:text-[11px]"
              >
                REPORT NOW
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center justify-center gap-2 border border-black bg-transparent px-8 py-4 text-[10px] font-bold uppercase tracking-[2px] text-black transition-colors hover:bg-[var(--surface)] sm:px-10 sm:py-5 sm:text-[11px]"
              >
                FRAUD ANALYTICS
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
              </Link>
            </div>

            <div
              className="mt-10 grid w-full max-w-[520px] grid-cols-3 gap-3 sm:mt-12 sm:gap-4 lg:max-w-none xl:max-w-[560px]"
              ref={statsRef.ref}
            >
              <StatPill label="COMPLAINTS" target={10} suffix="K+" active={statsRef.inView} />
              <StatPill label="RESOLUTION" target={92} suffix="%" active={statsRef.inView} />
              <StatPill label="FRAUD DETECTION" target={95} suffix="%" active={statsRef.inView} />
            </div>
          </div>

          {/* Right: image only, contained in column — no absolute overlap with left */}
          <div className="w-full shrink-0 lg:w-[min(46%,440px)] xl:w-[min(48%,480px)]">
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <Image
                src="/images/hero-visual.png"
                alt="Fraud detection — shield and verification graphic"
                className="h-auto w-full object-cover object-center"
                width={960}
                height={720}
                sizes="(max-width: 1024px) 100vw, 480px"
                priority
              />
            </div>
            <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] lg:text-left">
              Securing legal integrity
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
