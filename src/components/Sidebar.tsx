"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { fetchDashboardSummary } from "@/lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeCount, setActiveCount] = useState<number | null>(null);

  const categories = [
    {
      title: "OVERVIEW",
      items: [
        {
          name: "My Cases",
          href: "/dashboard",
          badge:
            activeCount != null && activeCount > 0
              ? { count: activeCount, type: "gold" as const }
              : undefined,
          dotColor: "bg-[var(--gold)]",
        },
        { name: "All Records", href: "/complaints", dotColor: "bg-[#8B8B82] opacity-40" },
      ],
    },
    {
      title: "TOOLS",
      items: [
        { name: "Fraud Analytics", href: "/analytics", dotColor: "bg-[#8B8B82] opacity-40" },
        { name: "ML Risk Score", href: "/ml-score", dotColor: "bg-[#8B8B82] opacity-40" },
        { name: "Timeline Viewer", href: "/timeline", dotColor: "bg-[#8B8B82] opacity-40" },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { name: "Notifications", href: "/notifications", dotColor: "bg-[#8B8B82] opacity-40" },
        { name: "Settings", href: "/settings", dotColor: "bg-[#8B8B82] opacity-40" },
      ],
    },
  ];

  useEffect(() => {
    const email = session?.user?.email;
    if (!email) {
      setActiveCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchDashboardSummary(email);
        if (!cancelled) setActiveCount(s.activeCases);
      } catch {
        if (!cancelled) setActiveCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email]);

  return (
    <aside
      className="sidebar-fill z-30 hidden w-[var(--sidebar-w)] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--cream)] pt-8 md:sticky md:top-[var(--nav-offset)] md:flex md:self-start"
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-6 lg:px-7">
        {categories.map((category, idx) => (
          <div key={category.title} className={idx > 0 ? "mt-10" : ""}>
            <div className="mb-5 text-[9px] font-bold tracking-[0.22em] text-[#A8A8A2] uppercase">
              {category.title}
            </div>
            <div className="flex flex-col gap-4">
              {category.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group/nav flex items-center justify-between rounded-lg px-1.5 py-1.5 text-[13px] transition-[transform,background-color,color] duration-200 ${
                      isActive
                        ? "bg-[rgba(15,15,15,0.04)] font-bold text-[var(--black)] shadow-[inset_2px_0_0_0_var(--gold)]"
                        : "text-[#555] hover:translate-x-0.5 hover:bg-[rgba(15,15,15,0.03)] hover:text-[var(--black)] active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-transform duration-200 ${
                          isActive ? "bg-[var(--gold)]" : `${item.dotColor} group-hover/nav:scale-125`
                        }`}
                      />
                      <span className="leading-snug">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                          item.badge.type === "gold"
                            ? "bg-[var(--gold)] text-white"
                            : "bg-[var(--danger)] text-white"
                        }`}
                      >
                        {item.badge.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-[var(--border)] p-6 lg:p-7">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="group flex w-full items-center gap-3 text-[13px] text-[#555] transition-colors hover:text-[var(--danger)]"
        >
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B8B82] opacity-40 group-hover:bg-[var(--danger)] group-hover:opacity-100" />
          <span className="leading-snug">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
