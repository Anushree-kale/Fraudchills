import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";

export default function Home() {
  return (
    <main className="landing" id="home">
      <HeroSection />

      <section className="section container" id="report">
        <h2 className="section-title reveal-up">The Public Record</h2>
        <p className="section-lead reveal-up stagger-1">
          Transparency by design. Every complaint is a permanent record on the ledger, 
          enriched with ML risk signals and tracked via public timelines.
        </p>
        <div className="feature-grid reveal-up stagger-2">
          <article className="fcard">
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

      <section className="section container">
        <h2 className="section-title reveal-up">Platform Surfaces</h2>
        <div className="preview-grid reveal-up stagger-1">
          <Link href="/complaints" className="preview-card preview-card--link">
            <h4>Public Feed</h4>
            <p className="preview-card__desc">Full transparency: Search, SLA timers, and verified evidence.</p>
            <div className="preview-visual" style={{ background: 'var(--parchment-dark)' }} />
          </Link>
          <Link href="/analytics" className="preview-card preview-card--link">
            <h4>Live Stats</h4>
            <p className="preview-card__desc">Real-time resolution rates and volume metrics for every brand.</p>
            <div className="preview-visual" style={{ background: 'var(--parchment-dark)', opacity: 0.6 }} />
          </Link>
          <Link href="/brands/claim" className="preview-card preview-card--link">
            <h4>Brand Logic</h4>
            <p className="preview-card__desc">Claim your profile and respond to records with official resolution tools.</p>
            <div className="preview-visual" style={{ border: 'var(--border-ink)', opacity: 0.4 }} />
          </Link>
        </div>
      </section>

      <section className="section container">
        <div className="cta-panel reveal-up" style={{ background: 'var(--ink)', color: 'var(--parchment)' }}>
          <h2 style={{ color: 'var(--parchment)' }}>Welcome to the community</h2>
          <p style={{ color: 'rgba(253, 252, 240, 0.7)' }}>
            Power your own detection with our ML prediction engine. Access real-time fraud scoring 
            and historical record lookups via a single endpoint.
          </p>
          <div className="hero-cta">
            <Link href="/auth/signup" className="btn-secondary" style={{ borderColor: 'var(--parchment)', color: 'var(--parchment)' }}>
              Developer Setup
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer" style={{ borderTop: 'var(--border-ink)', padding: '4rem 0' }}>
        <div className="container footer-grid">
          <div>
            <h3 className="logo" style={{ marginBottom: '1rem' }}>Fraudchills</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Consumer protection and fraud intelligence for modern commerce.</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resources</h4>
            <Link href="/complaints" style={{ display: 'block', marginBottom: '0.5rem' }}>Public Feed</Link>
            <Link href="/brands" style={{ display: 'block', marginBottom: '0.5rem' }}>Brand Directory</Link>
            <Link href="/analytics" style={{ display: 'block' }}>Platform Stats</Link>
          </div>
          <div>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Legal</h4>
            <Link href="#" style={{ display: 'block', marginBottom: '0.5rem' }}>Privacy</Link>
            <Link href="#" style={{ display: 'block' }}>Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
