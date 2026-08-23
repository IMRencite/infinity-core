"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  hqDashboardInspectionPath,
  inspectionRefFromVentureId,
} from "@/lib/infinity/operator-console/inspection-context";

type Props = {
  ventureId: string;
  className?: string;
  children: ReactNode;
};

export function hqVentureInspectionHref(ventureId: string): string {
  const ref = inspectionRefFromVentureId(ventureId);
  return ref ? hqDashboardInspectionPath(ref) : "/dashboard";
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
        router.replace(href, { scroll: false });
      }}
    >
      {children}
    </Link>
  );
}
