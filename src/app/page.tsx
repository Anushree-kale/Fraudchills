import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";

export default function Home() {
  return (
    <main className="landing landing-main" id="home">
      <HeroSection />

      {/* ── Public Record ── */}
      <section className="section container" id="report">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
          PLATFORM OVERVIEW
        </p>
        <h2 className="section-title reveal-up">The Public Record</h2>
        <p className="section-lead reveal-up stagger-1">
          Transparency by design. Every complaint is a permanent record on the ledger,
          enriched with ML risk signals and tracked via public timelines.
        </p>
        <div className="feature-grid reveal-up stagger-2">
          <article className="fcard">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
              01 — LIVE FEED
            </p>
            <h3>Trending Records</h3>
            <p>
              Monitor real-time fraud signals across the ecosystem. Updated live from
              our trending complaints endpoint.
            </p>
            <Link href="/complaints" className="inline-link">
              View Trending →
            </Link>
          </article>
          <article className="fcard" id="brands">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
              02 — DIRECTORY
            </p>
            <h3>Brand Directory</h3>
            <p>
              Verified brand profiles with resolution metrics. Search the directory to
              see how brands handle consumer issues.
            </p>
            <Link href="/brands" className="inline-link">
              Search Brands →
            </Link>
          </article>
          <article className="fcard">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
              03 — ANALYTICS
            </p>
            <h3>Fraud Analytics</h3>
            <p>
              Aggregated data on monthly volume, resolution rates, and fraud type
              classification powered by our analytics engine.
            </p>
            <Link href="/analytics" className="inline-link">
              See Dashboard →
            </Link>
          </article>
        </div>
      </section>

      {/* ── Platform Surfaces ── */}
      <section className="section container" style={{ paddingTop: 0 }}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
          EXPLORE
        </p>
        <h2 className="section-title reveal-up">Platform Surfaces</h2>
        <div className="preview-grid reveal-up stagger-1">
          <Link href="/complaints" className="preview-card preview-card--link">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
              PUBLIC FEED
            </p>
            <h4>Full Transparency</h4>
            <p className="preview-card__desc">Search, SLA timers, and verified evidence in one view.</p>
            <div className="preview-visual preview-visual--bars" />
          </Link>
          <Link href="/analytics" className="preview-card preview-card--link">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
              LIVE STATS
            </p>
            <h4>Real-Time Metrics</h4>
            <p className="preview-card__desc">Resolution rates and volume metrics for every brand, live.</p>
            <div className="preview-visual preview-visual--grid" />
          </Link>
          <Link href="/brands/claim" className="preview-card preview-card--link">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
              BRAND PORTAL
            </p>
            <h4>Brand Logic</h4>
            <p className="preview-card__desc">Claim your profile and respond with official resolution tools.</p>
            <div className="preview-visual preview-visual--minimal" />
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section container" style={{ paddingTop: 0 }}>
        <div className="cta-panel reveal-up">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            DEVELOPERS
          </p>
          <h2 style={{ color: "var(--parchment)", marginBottom: "0.75rem" }}>
            Welcome to the community
          </h2>
          <p>
            Power your own detection with our ML prediction engine. Access real-time fraud scoring
            and historical record lookups via a single endpoint.
          </p>
          <div className="hero-cta" style={{ justifyContent: "flex-start", marginTop: "1.75rem" }}>
            <Link
              href="/auth/signup"
              className="btn-secondary"
              style={{ borderColor: "var(--parchment)", color: "var(--parchment)" }}
            >
              Developer Setup
            </Link>
            <Link
              href="/analytics"
              className="btn-outline"
              style={{ borderColor: "rgba(201,168,76,0.5)", color: "var(--gold)" }}
            >
              View Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <p className="footer-brand">Fraudchills</p>
            <p style={{ maxWidth: "26ch" }}>
              Consumer protection and fraud intelligence for modern commerce.
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--ivory)",
                marginBottom: "1rem",
              }}
            >
              Resources
            </p>
            <Link href="/complaints">Public Feed</Link>
            <Link href="/brands">Brand Directory</Link>
            <Link href="/analytics">Platform Stats</Link>
          </div>
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--ivory)",
                marginBottom: "1rem",
              }}
            >
              Legal
            </p>
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}