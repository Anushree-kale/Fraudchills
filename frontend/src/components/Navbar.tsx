"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { name: "Trending", href: "/complaints" },
    { name: "Analytics", href: "/analytics" },
    { name: "Directory", href: "/brands" },
  ];

  return (
    <nav className="fixed top-0 left-0 z-[100] w-full h-[64px] border-b border-[var(--gold-20)] bg-[var(--cream)]/90 backdrop-blur-xl transition-all duration-500 hover:shadow-xl">
      <div className="mx-auto flex h-full w-full max-w-[var(--content-max)] items-center justify-between px-8 lg:px-12">
        
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" className="font-bebas text-2xl tracking-tighter transition-all hover:scale-105 active:scale-95 group">
            <span className="text-[var(--gold)]">FRAUD</span>
            <span className="text-[var(--obsidian)] group-hover:text-black transition-colors">CHILLS_</span>
          </Link>
        </div>

        {/* Center: Links */}
        <div className="hidden items-center gap-12 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`font-mono text-[10px] uppercase tracking-[0.25em] transition-all duration-300 relative py-1 group ${
                  isActive ? "text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--obsidian)]"
                }`}
              >
                {link.name}
                <span className={`absolute bottom-0 left-0 w-full h-px bg-[var(--gold)] transition-transform duration-500 origin-left ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
              </Link>
            );
          })}
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-8">
          {session ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group px-4 py-1.5 border border-transparent hover:border-[var(--gold-20)] rounded-full transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center font-bebas text-[11px] text-[var(--obsidian)] shadow-lg transition-transform group-hover:scale-110">
                {session.user?.name?.slice(0, 2).toUpperCase() || "FC"}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--obsidian)] hidden sm:inline">
                Dashboard
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[var(--obsidian)] transition-all hover:translate-x-[-4px]"
              >
                Login
              </Link>
              <Link
                href="/auth/signin" 
                className="bg-[var(--obsidian)] px-8 py-2.5 text-[10px] font-mono uppercase tracking-[0.25em] text-white transition-all hover:bg-black hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95"
              >
                Get Access
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
