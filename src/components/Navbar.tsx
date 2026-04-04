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
    <nav className="fixed top-0 left-0 z-50 flex h-[52px] w-full items-center justify-between border-b border-[var(--border)] bg-[var(--cream)] px-5 sm:px-8">
      <div className="flex items-center">
        <Link
          href="/"
          className="flex items-center font-bebas text-[22px] leading-none tracking-tight text-[var(--black)] sm:text-[24px]"
        >
          FRAUDCHILLS<span className="text-[var(--gold)]">_</span>
        </Link>
      </div>

      <div className="hidden items-center gap-8 md:flex md:gap-10 lg:gap-12">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`relative flex h-[52px] items-center text-[10px] font-bold tracking-[2.5px] transition-colors ${
                isActive ? "text-[var(--black)]" : "text-[var(--muted)] hover:text-[var(--black)]"
              }`}
            >
              {link.name}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--gold)]" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {session ? (
          <div className="flex cursor-pointer items-center gap-2.5 rounded-full border border-[#1A1A1A] bg-[#1A1A1A] py-1 pl-1 pr-4 text-white transition-colors hover:bg-black">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--gold)] pt-[0.5px] text-[10px] font-bold text-[var(--black)]">
              {initials}
            </div>
            <span className="hidden text-[11px] font-bold leading-none whitespace-nowrap sm:inline">
              {displayName}
            </span>
          </div>
        ) : (
          <>
            <Link
              href="/auth/signin"
              className="text-[10px] font-bold tracking-[2px] text-[var(--black)] uppercase transition-colors hover:text-[var(--gold)]"
            >
              LOGIN
            </Link>
            <Link
              href="/auth/signin?callbackUrl=%2Fcomplaints%2Fnew"
              className="bg-[var(--black)] px-4 py-2.5 text-[10px] font-bold tracking-[2px] text-white uppercase transition-colors hover:bg-[#2A2A2A] sm:px-5"
            >
              FILE RECORD
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
