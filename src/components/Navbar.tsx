"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "NK";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const displayName = session?.user?.name || "User";
  const initials = session?.user?.name ? getInitials(session.user.name) : "U";

  const navLinks = session
    ? [
        { name: "DASHBOARD", href: "/dashboard" },
        { name: "TRENDING", href: "/complaints" },
        { name: "ANALYTICS", href: "/analytics" },
        { name: "DIRECTORY", href: "/brands" },
      ]
    : [
        { name: "TRENDING", href: "/complaints" },
        { name: "ANALYTICS", href: "/analytics" },
        { name: "DIRECTORY", href: "/brands" },
      ];

  return (
    <nav
      className="fixed top-0 left-0 z-50 w-full border-b border-[var(--border)] bg-[var(--cream)]/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-[var(--nav-h)] w-full max-w-[100vw] items-center justify-between px-[var(--page-gutter)]">
        <div className="flex min-w-0 shrink-0 items-center">
          <Link
            href="/"
            className="flex items-center font-bebas text-[clamp(1.25rem,3.5vw,1.5rem)] leading-none tracking-tight text-[var(--black)] transition-[transform,opacity] duration-300 hover:opacity-90 active:scale-[0.98]"
          >
            FRAUDCHILLS<span className="text-[var(--gold)]">_</span>
          </Link>
        </div>

        <div className="hidden min-w-0 items-center justify-center gap-6 md:flex md:gap-8 lg:gap-10">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex h-[var(--nav-h)] items-center text-[10px] font-bold tracking-[0.18em] transition-colors duration-200 ${
                  isActive
                    ? "text-[var(--black)]"
                    : "text-[var(--muted)] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[var(--gold)] after:transition-[width] after:duration-300 after:ease-out hover:text-[var(--black)] hover:after:w-full"
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[var(--gold)]" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="group flex max-w-[10rem] cursor-pointer items-center gap-2 rounded-full border border-[#1A1A1A] bg-[#1A1A1A] py-1 pl-1 pr-3 text-white transition-[transform,background-color,box-shadow] duration-300 hover:bg-black hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] active:scale-[0.98] sm:max-w-none sm:pr-4"
            >
              <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--gold)] pt-px text-[10px] font-bold text-[var(--black)] transition-transform duration-300 group-hover:scale-105">
                {initials}
              </div>
              <span className="hidden truncate text-[11px] font-bold leading-none sm:inline">{displayName}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-[10px] font-bold tracking-[0.14em] text-[var(--black)] uppercase transition-[color,transform] duration-200 hover:text-[var(--gold)] active:scale-[0.98]"
              >
                LOGIN
              </Link>
              <Link
                href="/auth/signin?callbackUrl=%2Fcomplaints%2Fnew"
                className="bg-[var(--black)] px-3 py-2.5 text-[10px] font-bold tracking-[0.14em] text-white uppercase transition-[transform,background-color,box-shadow] duration-300 hover:bg-[#2A2A2A] hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] active:scale-[0.98] sm:px-5"
              >
                FILE RECORD
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
