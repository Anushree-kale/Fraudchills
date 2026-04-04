"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();

  const categories = [
    {
      title: "OVERVIEW",
      items: [
        { name: "My Cases", href: "/dashboard", badge: { count: 4, type: "gold" }, dotColor: "bg-[var(--gold)]" },
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

  return (
    <aside
      className="sidebar-fill fixed left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-[var(--border)] bg-[var(--cream)] pt-8 md:flex"
      style={{ top: "var(--nav-offset)" }}
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
                    className={`flex items-center justify-between rounded-md py-0.5 text-[13px] transition-colors ${
                      isActive ? "font-bold text-[var(--black)]" : "text-[#555] hover:text-[var(--black)]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-opacity ${
                          isActive ? "bg-[var(--gold)]" : item.dotColor
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
