"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import { LayoutDashboard, BarChart3, Search, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const mobileTabs = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Directory", href: "/brands", icon: Search },
    { name: "My Cases", href: "/complaints/my", icon: FileText },
    { name: "Report", href: "/complaints/new", icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--cream)] md:flex md:min-h-[100dvh] md:flex-row md:items-stretch">
      <Sidebar />
      <main className="mx-auto w-full min-w-0 max-w-[min(100rem,100%)] flex-1 px-[var(--page-gutter)] pb-[max(5.5rem,env(safe-area-inset-bottom,0px))] pt-[var(--nav-offset)] md:mx-0 md:max-w-none md:pb-10">
        <div className="py-6 md:py-8 lg:py-10">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 z-50 flex h-[calc(var(--mobile-tab-h)+env(safe-area-inset-bottom,0px))] w-full items-center justify-around border-t border-[var(--border)] bg-[var(--cream)]/95 px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
        aria-label="Mobile navigation"
      >
        {mobileTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                isActive ? "text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--black)]"
              }`}
              aria-label={tab.name}
            >
              <Icon size={22} strokeWidth={isActive ? 2.25 : 2} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
