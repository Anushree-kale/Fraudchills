"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const home = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`site-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-content">
        <Link href="/" className="logo" onClick={() => setOpen(false)}>
          FRAUDCHILLS
        </Link>

        <button
          type="button"
          className="nav-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          style={{ color: 'var(--ink)' }}
        >
          {open ? "✕" : "☰"}
        </button>

        <div className={`nav-links ${open ? "open" : ""}`}>
          <Link href="/complaints" className="nav-link" onClick={() => setOpen(false)}>
            Trending
          </Link>
          <Link href="/analytics" className="nav-link" onClick={() => setOpen(false)}>
            Analytics
          </Link>
          <Link href="/brands" className="nav-link" onClick={() => setOpen(false)}>
            Directory
          </Link>
          
          <div className="nav-divider" />

          {session ? (
            <button type="button" onClick={() => signOut()} className="nav-link">
              Logout
            </button>
          ) : (
            <Link href="/auth/signin?callbackUrl=%2Fcomplaints%2Fnew" className="nav-link" onClick={() => setOpen(false)}>
              Login
            </Link>
          )}

          <Link
            href={session ? "/dashboard" : "/auth/signin?callbackUrl=%2Fdashboard"}
            className="btn-black"
            onClick={() => setOpen(false)}
          >
            File Record
          </Link>
        </div>
      </div>
    </nav>
  );
}
