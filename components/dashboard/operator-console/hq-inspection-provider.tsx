"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import {
  INSPECTION_QUERY_PARAM,
  formatInspectionQuery,
  parseInspectionQuery,
  type HqInspectionContext,
  type HqInspectionRef,
} from "@/lib/infinity/operator-console/inspection-model";
import { resolveHqInspectionContext, systemsViewForInspection } from "@/lib/infinity/operator-console/inspection-resolve";
import { canonicalizeInspectionRef } from "@/lib/infinity/hq-inspection-identity/aliases";
import { buildHqClearInspectionHref, buildHqVentureInspectionHref } from "@/lib/infinity/hq-venture-selection/navigate";

type HqInspectionValue = {
  context: HqInspectionContext;
  systemsArchitectView: SystemsArchitectHqView | null;
  workspaceOpen: boolean;
  selectInspection: (ref: HqInspectionRef) => void;
  clearInspection: () => void;
  closeInspectionWorkspace: () => void;
};

const HqInspectionReactContext = createContext<HqInspectionValue | null>(null);

export function HqInspectionProvider({
  snapshot,
  children,
}: {
  snapshot: OperatorVentureSnapshot;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicit = useMemo(
    () => parseInspectionQuery(searchParams.get(INSPECTION_QUERY_PARAM)),
    [searchParams],
  );
  const context = useMemo(() => resolveHqInspectionContext(snapshot, explicit), [explicit, snapshot]);
  const systemsArchitectView = useMemo(
    () => systemsViewForInspection(snapshot, context, snapshot.systemsArchitecture ?? null),
    [context, snapshot],
  );
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceEntityKey = context.explicit && context.entityId ? `${context.entityType}:${context.entityId}` : null;
  const lastWorkspaceEntityKey = useRef<string | null>(null);

  useEffect(() => {
    if (workspaceEntityKey && workspaceEntityKey !== lastWorkspaceEntityKey.current) {
      lastWorkspaceEntityKey.current = workspaceEntityKey;
      if (context.entityType !== "VENTURE") {
        setWorkspaceOpen(true);
      }
      return;
    }
    if (!workspaceEntityKey) {
      lastWorkspaceEntityKey.current = null;
      setWorkspaceOpen(false);
    }
  }, [context.entityType, workspaceEntityKey]);

  const writeInspect = useCallback(
    (ref: HqInspectionRef | null) => {
      const currentSearch = searchParams.toString();
      const canonical = ref ? canonicalizeInspectionRef(ref) ?? ref : null;
      const href = canonical
        ? buildHqVentureInspectionHref(canonical, currentSearch)
        : buildHqClearInspectionHref(currentSearch);
      if (canonical && searchParams.get(INSPECTION_QUERY_PARAM) !== formatInspectionQuery(canonical)) {
        router.push(href, { scroll: false });
        return;
      }
      router.replace(href, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const canonical = canonicalizeInspectionRef(explicit);
    if (
      explicit &&
      canonical &&
      (canonical.entityType !== explicit.entityType || canonical.entityId !== explicit.entityId)
    ) {
      writeInspect(canonical);
    }
  }, [explicit, writeInspect]);

  const value = useMemo<HqInspectionValue>(
    () => ({
      context,
      systemsArchitectView,
      workspaceOpen,
      selectInspection: (ref) => {
        if (ref.entityType !== "VENTURE") setWorkspaceOpen(true);
        writeInspect(ref);
      },
      clearInspection: () => {
        setWorkspaceOpen(false);
        lastWorkspaceEntityKey.current = null;
        writeInspect(null);
      },
      closeInspectionWorkspace: () => setWorkspaceOpen(false),
    }),
    [context, systemsArchitectView, workspaceOpen, writeInspect],
  );

  return <HqInspectionReactContext.Provider value={value}>{children}</HqInspectionReactContext.Provider>;
}

export function useHqInspection(): HqInspectionValue {
  const value = useContext(HqInspectionReactContext);
  if (!value) {
    throw new Error("useHqInspection must be used within HqInspectionProvider");
  }
  return value;
}

export function useOptionalHqInspection(): HqInspectionValue | null {
  return useContext(HqInspectionReactContext);
}
