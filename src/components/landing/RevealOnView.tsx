"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

export default function RevealOnView({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal-on-view ${inView ? "reveal-on-view--in" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
