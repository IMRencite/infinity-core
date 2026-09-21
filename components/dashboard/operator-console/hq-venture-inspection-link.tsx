"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { inspectionRefFromVentureId } from "@/lib/infinity/operator-console/inspection-ref";
import { buildHqVentureInspectionHref } from "@/lib/infinity/hq-venture-selection/navigate";

type Props = {
  ventureId: string;
  className?: string;
  children: ReactNode;
};

export function hqVentureInspectionHref(ventureId: string): string {
  const ref = inspectionRefFromVentureId(ventureId);
  return ref ? buildHqVentureInspectionHref(ref) : "/dashboard";
}

export function HqVentureInspectionLink({ ventureId, className, children }: Props) {
  const router = useRouter();
  const href = hqVentureInspectionHref(ventureId);

  return (
    <Link
      href={href}
      className={className}
      data-hq-inspection-card="venture"
      onClick={(event) => {
        event.preventDefault();
        if (!inspectionRefFromVentureId(ventureId)) return;
        router.push(href, { scroll: false });
      }}
    >
      {children}
    </Link>
  );
}
