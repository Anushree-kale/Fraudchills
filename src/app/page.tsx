import Link from "next/link";
import {
  Plus,
  Zap,
  Target,
  Layers,
  ShieldCheck,
  FileText,
  Bell,
  Eye,
  ArrowRight
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--cream)] overflow-x-hidden pt-[64px]">

      {/* ── HERO SECTION ── */}
      <section className="relative w-full min-h-[92vh] grid grid-cols-1 lg:grid-cols-2 bg-[var(--cream)] border-b border-[var(--gold-20)]">
        {/* Left Column */}
        <div className="flex flex-col justify-center px-10 xl:px-28 py-20 animate-fade-up">
          <div className="mb-10 flex items-center gap-3">
            <span className="text-[var(--gold)] text-xl">⬡</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
              Real-time fraud intelligence
            </span>
          </div>

          <h1 className="font-bebas text-[clamp(4.5rem,11vw,9rem)] leading-[0.82] text-[var(--obsidian)] tracking-tighter mb-12">
            Stop <br />
            <span className="text-[var(--gold)] transition-colors hover:text-[var(--gold-light)]">Fraud</span> <br />
            Before <br />
            It Hits.
          </h1>

          <p className="font-body text-xl text-[var(--muted)] max-w-[42ch] mb-14 leading-relaxed">
            The decentralized ledger for consumer trust. Track, report, and analyze
            high-risk signals with real-time machine learning telemetry.
          </p>

          <div className="flex flex-wrap gap-6 mb-20">
            <Link href="/auth/signin" className="bg-[var(--obsidian)] text-white px-12 py-6 text-[10px] font-mono uppercase tracking-[0.25em] transition-all hover:bg-black hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-95">
              File a Report
            </Link>
            <Link href="/analytics" className="group border border-[var(--obsidian)] text-[var(--obsidian)] px-12 py-6 text-[10px] font-mono uppercase tracking-[0.25em] transition-all hover:bg-[var(--cream-dark)]">
              Fraud Analytics <span className="inline-block transition-transform group-hover:translate-y-1">↓</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-12 pt-12 border-t border-[var(--gold-20)]">
            <div>
              <span className="block font-bebas text-6xl text-[var(--gold)] mb-2">10K+</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">Complaints</span>
            </div>
            <div className="border-l border-[var(--gold-20)] pl-12">
              <span className="block font-bebas text-6xl text-[var(--gold)] mb-2">92%</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">Resolution</span>
            </div>
            <div className="border-l border-[var(--gold-20)] pl-12">
              <span className="block font-bebas text-6xl text-[var(--gold)] mb-2">95%</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">Accuracy</span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="hidden lg:block relative bg-[var(--dark)] overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-grid-gold opacity-[0.08] animate-[pulsingGrid_6s_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[var(--gold)]/10 rounded-full blur-[180px]" />

          {/* Rotating Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
            <div className="absolute inset-0 border border-[var(--gold)]/20 rounded-full animate-[rotateRing_25s_linear_infinite]" />
            <div className="absolute inset-10 border border-[var(--gold)]/10 rounded-full animate-[rotateRing_18s_linear_infinite_reverse]" />
            <div className="absolute inset-20 border border-[var(--gold)]/5 rounded-full animate-[rotateRing_50s_linear_infinite]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center shadow-[0_0_60px_rgba(201,162,39,0.3)] animate-pulse">
                <Plus className="text-[var(--gold)] w-10 h-10" strokeWidth={1} />
              </div>
            </div>
          </div>

          {/* Floating Cards */}
          <div className="absolute top-[20%] left-[15%] p-6 bg-[var(--dark-card)] border border-[var(--gold)]/30 shadow-2xl animate-float" style={{ animationDelay: '0s' }}>
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--gold)] mb-3">Live Signal</span>
            <span className="block font-bebas text-3xl text-red-500 mb-1">HIGH</span>
            <span className="block font-mono text-[10px] text-[var(--muted)]">Threshold exceeded</span>
          </div>

          <div className="absolute top-[45%] right-[12%] p-7 bg-[var(--dark-card)] border border-[var(--gold)]/50 shadow-2xl animate-float" style={{ animationDelay: '1s' }}>
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--gold)] mb-3">ML Engine</span>
            <span className="block font-bebas text-4xl text-white mb-1">97.4%</span>
            <span className="block font-mono text-[10px] text-[var(--muted)]">Pattern match: synthetic</span>
          </div>

          <div className="absolute bottom-[22%] left-[12%] p-6 bg-[var(--dark-card)] border border-[var(--gold)]/30 shadow-2xl animate-float" style={{ animationDelay: '0.5s' }}>
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--gold)] mb-3">Resolution</span>
            <span className="flex items-center gap-4">
              <span className="font-bebas text-3xl text-white">241</span>
              <span className="font-mono text-[10px] text-[var(--success)]">↑ 12%</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── GOLD TICKER ── */}
      <div className="w-full bg-[var(--gold)] py-3 border-y border-black/10 overflow-hidden select-none">
        <div className="flex animate-ticker whitespace-nowrap">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-16 px-8">
              <span className="font-mono text-[10px] font-bold text-black uppercase tracking-[0.3em]">Live Feed Active</span>
              <span className="text-black/20 text-lg">⊕</span>
              <span className="font-mono text-[10px] font-bold text-black uppercase tracking-[0.3em]">92% Resolution Rate</span>
              <span className="text-black/20 text-lg">⊕</span>
              <span className="font-mono text-[10px] font-bold text-black uppercase tracking-[0.3em]">ML Fraud Detection</span>
              <span className="text-black/20 text-lg">⊕</span>
              <span className="font-mono text-[10px] font-bold text-black uppercase tracking-[0.3em]">Public Record</span>
              <span className="text-black/20 text-lg">⊕</span>
              <span className="font-mono text-[10px] font-bold text-black uppercase tracking-[0.3em]">10K+ Complaints</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PLATFORM OVERVIEW ── */}
      <section className="relative py-[var(--section-y)] px-10 xl:px-24 bg-[var(--dark)] overflow-hidden dark-section">
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center select-none pointer-events-none">
          <span className="font-bebas text-[32vw] text-white/[0.02] leading-none">PUBLIC</span>
        </div>

        <div className="relative z-10 max-w-[var(--content-max)] mx-auto">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-16 h-px bg-[var(--gold)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Infrastructure</span>
          </div>

          <h2 className="font-bebas text-8xl md:text-9xl text-white mb-28 tracking-tighter leading-none">
            The <span className="text-[var(--gold)]">Public</span> Record
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: "01",
                icon: <Zap className="w-8 h-8 text-[var(--gold)]" strokeWidth={1} />,
                badge: "Live Feed",
                title: "Trending Records",
                desc: "Monitor real-time fraud signals enriched with deep ML risk telemetry.",
                link: "/complaints"
              },
              {
                id: "02",
                icon: <Target className="w-8 h-8 text-[var(--gold)]" strokeWidth={1} />,
                badge: "Directory",
                title: "Brand Directory",
                desc: "Verified profiles with public resolution scores and performance data.",
                link: "/brands"
              },
              {
                id: "03",
                icon: <Layers className="w-8 h-8 text-[var(--gold)]" strokeWidth={1} />,
                badge: "Analytics",
                title: "Fraud Analytics",
                desc: "Deep insights into fraud trends and brand accountability metrics.",
                link: "/analytics"
              }
            ].map((f) => (
              <div key={f.id} className="group p-14 bg-[var(--dark-card)] border border-white/5 hover:border-[var(--gold)]/30 hover:bg-black transition-all relative overflow-hidden">
                <span className="block font-mono text-[10px] text-[var(--gold)] mb-12 tracking-[0.2em] opacity-60">{f.id} // {f.badge}</span>
                <div className="mb-8 transition-transform group-hover:scale-110 duration-500">{f.icon}</div>
                <h3 className="font-bebas text-5xl text-white mb-6 tracking-wide transition-colors group-hover:text-[var(--gold)]">{f.title}</h3>
                <p className="font-body text-lg text-[var(--muted)] mb-14 leading-relaxed">{f.desc}</p>
                <Link href={f.link} className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--gold)] hover:text-white transition-colors">
                  Open Engine <ArrowRight className="w-4 h-4 group-hover:translate-x-3 transition-transform" />
                </Link>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="py-20 bg-[var(--cream-dark)] border-y border-black/5">
        <div className="max-w-[var(--content-max)] mx-auto px-10">
          <div className="flex flex-wrap justify-between gap-y-12">
            {[
              { icon: <ShieldCheck className="w-6 h-6" />, text: "Real-time ML detection" },
              { icon: <FileText className="w-6 h-6" />, text: "Permanent ledger record" },
              { icon: <Bell className="w-6 h-6" />, text: "Verified complaint chain" },
              { icon: <Eye className="w-6 h-6" />, text: "Public transparency" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-5 group">
                <div className="p-3 rounded-full bg-white/20 text-[var(--dim)] group-hover:bg-[var(--gold)] group-hover:text-black transition-all">
                  {item.icon}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--dim)] group-hover:text-black transition-colors">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-[var(--section-y)] px-10 xl:px-24 bg-[var(--cream)]">
        <div className="max-w-[var(--content-max)] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div>
            <div className="flex items-center gap-5 mb-10">
              <div className="w-16 h-px bg-[var(--gold)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">Protocol</span>
            </div>
            <h2 className="font-bebas text-8xl text-[var(--obsidian)] mb-20 tracking-tighter leading-none">How It Works</h2>

            <div className="space-y-4">
              {[
                "File a Verified Complaint",
                "ML Risk Enrichment",
                "Brand Notification",
                "Public Resolution Record"
              ].map((step, i) => (
                <div key={i} className="group flex items-start gap-12 p-8 hover:bg-[var(--cream-dark)] transition-all border-l-2 border-transparent hover:border-[var(--gold)]">
                  <span className="font-bebas text-5xl text-[var(--gold)]/10 group-hover:text-[var(--gold)] transition-colors leading-none">0{i + 1}</span>
                  <div>
                    <h4 className="font-bebas text-4xl text-[var(--obsidian)] mb-3 tracking-wide group-hover:translate-x-2 transition-transform">{step}</h4>
                    <p className="font-body text-lg text-[var(--muted)]">Automated workflows ensure every claim is verified and visible to the ecosystem.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--dark)] p-1 rounded-2xl shadow-3xl transform hover:rotate-1 transition-transform duration-700">
            <div className="bg-[var(--dark)] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 bg-white/5">
                <div className="flex gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-widest">LIVE protocol : // feed_root</span>
              </div>
              <div className="p-10 space-y-8">
                {[
                  { brand: "Aether Luxe", type: "Synthetic Fraud", time: "2m ago", risk: "HIGH", color: "text-red-500 border-red-500/20 bg-red-500/5" },
                  { brand: "Urban Edge", type: "Order Issue", time: "14m ago", risk: "MEDIUM", color: "text-[var(--gold)] border-[var(--gold)]/20 bg-[var(--gold)]/5" },
                  { brand: "Solaris Tech", type: "Refund Avoidance", time: "28m ago", risk: "LOW", color: "text-[var(--success)] border-[var(--success)]/20 bg-[var(--success)]/5" },
                  { brand: "Nova Market", type: "Identity Theft", time: "1h ago", risk: "HIGH", color: "text-red-500 border-red-500/20 bg-red-500/5" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between hover:translate-x-2 transition-transform cursor-default">
                    <div className="flex flex-col">
                      <span className="font-bebas text-2xl text-white tracking-wide">{item.brand}</span>
                      <span className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-wider">{item.type}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="font-mono text-[9px] text-[var(--dim)] uppercase">{item.time}</span>
                      <span className={`px-3 py-1 border font-mono text-[8px] font-bold rounded-full ${item.color}`}>{item.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="relative py-[var(--section-y)] px-10 xl:px-24 bg-[var(--obsidian)] overflow-hidden dark-section">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[var(--gold)]/5 rounded-full blur-[160px] translate-y-1/2 translate-x-1/4" />

        <div className="relative z-10 max-w-[var(--content-max)] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="font-bebas text-8xl md:text-[10rem] text-white leading-[0.8] tracking-tighter mb-12">
                Secure Your <br />
                <span className="text-[var(--gold)] animate-pulse">COMMERCE</span>
              </h2>
              <p className="font-body text-2xl text-[var(--muted)] max-w-[30ch] leading-relaxed">
                Join the alpha network and start securing your ecosystem today.
              </p>
            </div>

            <div className="w-full max-w-xl mx-auto lg:ml-auto">
              <div className="bg-[var(--dark-card)] p-12 border border-white/5 shadow-3xl">
                <h3 className="font-bebas text-4xl text-white mb-8 tracking-wide">Request Access</h3>
                <div className="space-y-5">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full bg-[var(--dark)] border border-white/5 px-8 py-6 font-mono text-sm text-white focus:outline-none focus:border-[var(--gold)] transition-all placeholder:opacity-30"
                  />
                  <button className="w-full bg-[var(--gold)] text-black py-6 font-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:scale-[1.02] transition-all">
                    Initialize Setup
                  </button>
                </div>
                <p className="mt-8 font-mono text-[9px] text-[var(--dim)] text-center uppercase tracking-widest">
                  Alpha v1.0.4 — protocol access pending
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-10 xl:px-24 bg-[var(--dark)] border-t border-white/5 dark-section">
        <div className="max-w-[var(--content-max)] mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="font-bebas text-3xl tracking-tighter flex items-center gap-3">
            <span className="text-[var(--gold)]">FRAUD</span>
            <span className="text-white">CHILLS_</span>
          </div>

          <div className="flex gap-14">
            {["Privacy", "Terms", "API", "Contact"].map((link) => (
              <Link key={link} href="#" className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted)] hover:text-[var(--gold)] transition-colors">
                {link}
              </Link>
            ))}
          </div>

          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--dim)]">
            © 2026 FRAUDCHILLS. DISTRIBUTED PROTOCOL.
          </div>
        </div>
      </footer>

    </main>
  );
}