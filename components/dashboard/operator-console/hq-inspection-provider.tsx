"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { SystemsArchitectHqView } from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import {
  INSPECTION_QUERY_PARAM,
  formatInspectionQuery,
  parseInspectionQuery,
  resolveHqInspectionContext,
  systemsViewForInspection,
  type HqInspectionContext,
  type HqInspectionRef,
} from "@/lib/infinity/operator-console/inspection-context";

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
      setWorkspaceOpen(true);
      return;
    }
    if (!workspaceEntityKey) {
      lastWorkspaceEntityKey.current = null;
      setWorkspaceOpen(false);
    }
  }, [workspaceEntityKey]);

  const writeInspect = useCallback(
    (ref: HqInspectionRef | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ref) params.set(INSPECTION_QUERY_PARAM, formatInspectionQuery(ref));
      else params.delete(INSPECTION_QUERY_PARAM);
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const value = useMemo<HqInspectionValue>(
    () => ({
      context,
      systemsArchitectView,
      workspaceOpen,
      selectInspection: (ref) => {
        setWorkspaceOpen(true);
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
