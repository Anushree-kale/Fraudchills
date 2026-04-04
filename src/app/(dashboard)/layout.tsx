"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import { 
  LayoutDashboard, 
  BarChart3, 
  Search, 
  FileText, 
  PlusCircle 
} from "lucide-react";
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
    <div className="min-h-screen bg-[var(--cream)]">
      <Sidebar />
      <main className="md:ml-[220px] pt-[52px] px-10 py-9 pb-[100px] md:pb-12 bg-[var(--cream)] min-h-screen">
        {children}
      </main>

      {/* Mobile Tab Bar */}
      <nav className="fixed bottom-0 left-0 w-full h-[64px] bg-[var(--cream)] border-t border-[var(--border)] z-50 flex items-center justify-around md:hidden px-4 shadow-sm">
        {mobileTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link 
              key={tab.name} 
              href={tab.href}
              className={`flex items-center justify-center w-12 h-12 transition-colors ${
                isActive ? "text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--black)]"
              }`}
            >
              <Icon size={24} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
