"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { HqArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import type { HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import {
  buildEntityDetail,
  formatDetailQueryParam,
  parseDetailQueryParam,
} from "@/lib/infinity/operator-console/details/build-entity-detail";
import {
  buildArtifactInspectorModel,
  flattenRoomArtifacts,
} from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  applyHqDetailClose,
  applyHqDetailOpen,
  createHqDetailSession,
  settleHqDetailUrl,
  shouldCommitDetailResponse,
  shouldOpenFromUrl,
  shouldRestoreSelectionFromSnapshot,
  type HqDetailSession,
} from "@/lib/infinity/operator-console/artifacts/hq-detail-session";

type InspectorContextValue = {
  selectedArtifactId: string | null;
  requestedArtifactId: string | null;
  model: HqArtifactInspectorModel | null;
  entityDetail: HQEntityDetail | null;
  loading: boolean;
  error: string | null;
  inventory: { roomName: string; artifacts: HqWorkArtifact[] } | null;
  openInspector: (artifact: HqWorkArtifact) => void;
  openRoomInventory: (input: { roomName: string; artifacts: HqWorkArtifact[] }) => void;
  backToInventory: () => void;
  closeInspector: () => void;
  switchArtifact: (artifactId: string) => void;
};

const HqArtifactInspectorContext = createContext<InspectorContextValue | null>(null);

export function useHqArtifactInspector(): InspectorContextValue {
  const ctx = useContext(HqArtifactInspectorContext);
  if (!ctx) {
    throw new Error("useHqArtifactInspector must be used within HqArtifactInspectorProvider");
  }
  return ctx;
}

export function useOptionalHqArtifactInspector(): InspectorContextValue | null {
  return useContext(HqArtifactInspectorContext);
}

type ProviderProps = {
  ventureId: string;
  snapshot: OperatorVentureSnapshot;
  detailQueryParam?: string | null;
  onDetailQueryChange?: (detailQuery: string | null) => void;
  children: ReactNode;
};

export function HqArtifactInspectorProvider({
  ventureId,
  snapshot,
  detailQueryParam = null,
  onDetailQueryChange,
  children,
}: ProviderProps) {
  const parsedDetail = parseDetailQueryParam(detailQueryParam);
  const initialArtifactId = parsedDetail?.kind === "artifact" ? parsedDetail.id : null;

  const sessionRef = useRef<HqDetailSession>(createHqDetailSession(initialArtifactId));
  const abortRef = useRef<AbortController | null>(null);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(initialArtifactId);
  const [requestedArtifactId, setRequestedArtifactId] = useState<string | null>(initialArtifactId);
  const [model, setModel] = useState<HqArtifactInspectorModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<{ roomName: string; artifacts: HqWorkArtifact[] } | null>(null);

  const allArtifacts = useMemo(
    () => flattenRoomArtifacts(snapshot.roomArtifacts, snapshot.departments),
    [snapshot.departments, snapshot.roomArtifacts],
  );

  const entityDetail = useMemo(() => (model ? buildEntityDetail(model) : null), [model]);

  const syncSessionState = useCallback((next: HqDetailSession) => {
    sessionRef.current = next;
    setSelectedArtifactId(next.selectedArtifactId);
    setRequestedArtifactId(next.requestedArtifactId);
  }, []);

  const loadInspector = useCallback(
    async (artifact: HqWorkArtifact) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const next = applyHqDetailOpen(sessionRef.current, artifact.id);
      syncSessionState(next);
      const responseGeneration = next.requestGeneration;

      setLoading(true);
      setError(null);
      onDetailQueryChange?.(formatDetailQueryParam(artifact.id));

      const fallback = buildArtifactInspectorModel(artifact, allArtifacts);
      setModel(fallback);

      try {
        const res = await fetch(
          `/api/operator-console/artifacts/${encodeURIComponent(artifact.id)}?ventureId=${encodeURIComponent(ventureId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (
          !shouldCommitDetailResponse({
            activeGeneration: sessionRef.current.requestGeneration,
            responseGeneration,
            selectedArtifactId: sessionRef.current.selectedArtifactId,
            requestedArtifactId: sessionRef.current.requestedArtifactId,
            responseArtifactId: artifact.id,
          })
        ) {
          return;
        }
        if (res.status === 404) {
          setError("Artifact not found");
          return;
        }
        if (!res.ok) {
          setError("Could not load artifact detail");
          return;
        }
        const payload = (await res.json()) as { model: HqArtifactInspectorModel };
        if (
          !shouldCommitDetailResponse({
            activeGeneration: sessionRef.current.requestGeneration,
            responseGeneration,
            selectedArtifactId: sessionRef.current.selectedArtifactId,
            requestedArtifactId: sessionRef.current.requestedArtifactId,
            responseArtifactId: artifact.id,
          })
        ) {
          return;
        }
        setModel(payload.model);
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        if (
          !shouldCommitDetailResponse({
            activeGeneration: sessionRef.current.requestGeneration,
            responseGeneration,
            selectedArtifactId: sessionRef.current.selectedArtifactId,
            requestedArtifactId: sessionRef.current.requestedArtifactId,
            responseArtifactId: artifact.id,
          })
        ) {
          return;
        }
        setError("Could not load artifact detail");
      } finally {
        if (responseGeneration === sessionRef.current.requestGeneration) {
          setLoading(false);
        }
      }
    },
    [allArtifacts, onDetailQueryChange, syncSessionState, ventureId],
  );

  const openInspector = useCallback(
    (artifact: HqWorkArtifact) => {
      void loadInspector(artifact);
    },
    [loadInspector],
  );

  const closeHQDetail = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const currentQuery = detailQueryParam ?? (sessionRef.current.selectedArtifactId ? formatDetailQueryParam(sessionRef.current.selectedArtifactId) : null);
    syncSessionState(applyHqDetailClose(sessionRef.current, currentQuery));
    setInventory(null);
    setModel(null);
    setError(null);
    setLoading(false);
    onDetailQueryChange?.(null);
  }, [detailQueryParam, onDetailQueryChange, syncSessionState]);

  const closeInspector = closeHQDetail;

  const openRoomInventory = useCallback((input: { roomName: string; artifacts: HqWorkArtifact[] }) => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (sessionRef.current.selectedArtifactId) {
      const currentQuery = detailQueryParam ?? formatDetailQueryParam(sessionRef.current.selectedArtifactId);
      syncSessionState(applyHqDetailClose(sessionRef.current, currentQuery));
      onDetailQueryChange?.(null);
    }
    setModel(null);
    setError(null);
    setLoading(false);
    setInventory({ roomName: input.roomName, artifacts: input.artifacts });
  }, [detailQueryParam, onDetailQueryChange, syncSessionState]);

  const backToInventory = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const currentQuery = detailQueryParam ?? (sessionRef.current.selectedArtifactId ? formatDetailQueryParam(sessionRef.current.selectedArtifactId) : null);
    syncSessionState(applyHqDetailClose(sessionRef.current, currentQuery));
    setModel(null);
    setError(null);
    setLoading(false);
    onDetailQueryChange?.(null);
  }, [detailQueryParam, onDetailQueryChange, syncSessionState]);

  const switchArtifact = useCallback(
    (artifactId: string) => {
      const artifact = allArtifacts.find((a) => a.id === artifactId);
      if (artifact) void loadInspector(artifact);
    },
    [allArtifacts, loadInspector],
  );

  useEffect(() => {
    if (!shouldRestoreSelectionFromSnapshot(selectedArtifactId)) return;
    const artifact = allArtifacts.find((a) => a.id === selectedArtifactId);
    if (!artifact || !model) return;
    if (model.artifact.state !== artifact.state || model.artifact.title !== artifact.title) {
      setModel((prev) => (prev ? buildArtifactInspectorModel(artifact, allArtifacts) : prev));
    }
  }, [allArtifacts, model, selectedArtifactId]);

  useEffect(() => {
    sessionRef.current = settleHqDetailUrl(sessionRef.current, detailQueryParam);
    const openId = shouldOpenFromUrl(sessionRef.current, detailQueryParam, Boolean(model));
    if (!openId) return;
    const artifact = allArtifacts.find((a) => a.id === openId);
    if (!artifact) return;
    void loadInspector(artifact);
  }, [allArtifacts, detailQueryParam, loadInspector, model]);

  useEffect(() => {
    if (!selectedArtifactId && !inventory) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [inventory, selectedArtifactId]);

  const value: InspectorContextValue = {
    selectedArtifactId,
    requestedArtifactId,
    model,
    entityDetail,
    loading,
    error,
    inventory,
    openInspector,
    openRoomInventory,
    backToInventory,
    closeInspector,
    switchArtifact,
  };

  return <HqArtifactInspectorContext.Provider value={value}>{children}</HqArtifactInspectorContext.Provider>;
}
