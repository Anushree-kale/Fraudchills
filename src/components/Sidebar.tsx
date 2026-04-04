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
      ]
    },
    {
      title: "TOOLS",
      items: [
        { name: "Fraud Analytics", href: "/analytics", dotColor: "bg-[#8B8B82] opacity-40" },
        { name: "ML Risk Score", href: "/ml-score", dotColor: "bg-[#8B8B82] opacity-40" },
        { name: "Timeline Viewer", href: "/timeline", dotColor: "bg-[#8B8B82] opacity-40" },
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        { name: "Notifications", href: "/notifications", dotColor: "bg-[#8B8B82] opacity-40" },
        { name: "Settings", href: "/settings", dotColor: "bg-[#8B8B82] opacity-40" },
      ]
    }
  ];

  return (
    <aside className="fixed left-0 top-[52px] w-[220px] h-[calc(100vh-52px)] bg-[var(--cream)] border-r border-[var(--border)] z-40 hidden md:flex flex-col pt-10">
      <nav className="flex-1 overflow-y-auto px-8">
        {categories.map((category, idx) => (
          <div key={category.title} className={idx > 0 ? "mt-12" : ""}>
            <div className="text-[9px] tracking-[2.5px] text-[#A8A8A2] font-bold mb-6 uppercase">
              {category.title}
            </div>
            <div className="space-y-5">
              {category.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between text-[13px] transition-colors group ${
                      isActive ? "text-[var(--black)] font-bold" : "text-[#555] hover:text-[var(--black)]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-[6px] h-[6px] rounded-full transition-opacity ${isActive ? 'bg-[var(--gold)]' : item.dotColor}`} />
                      <span className="leading-none">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${
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
      {/* Logout */}
      <div className="p-8 mt-auto">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3.5 text-[13px] text-[#555] hover:text-[var(--danger)] transition-colors w-full group"
        >
          <div className="w-[6px] h-[6px] rounded-full bg-[#8B8B82] opacity-40 group-hover:bg-[var(--danger)] group-hover:opacity-100" />
          <span className="leading-none">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
