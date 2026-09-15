"use client";

import type { OperatorVentureSnapshot, DepartmentId } from "@/lib/infinity/operator-console/types";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import { favc1CyclePollUrl, isFavc1PollingVentureId } from "./favc1-cycle-header";
import { VentureCommandBar } from "./venture-command-bar";
import { VentureSelector } from "./venture-selector";
import { InspectionContextBar } from "./inspection-context-bar";
import { HqFoldSkeleton } from "./infinity-os-hero";
import { CurrentActivityBar } from "./current-activity-bar";
import { HqSpatialFloor } from "./hq-spatial-floor";
import { CommandChamber } from "./command-chamber";
import { ActivityFeedPanel } from "./activity-feed-panel";
import { SystemView } from "./system-view";
import { DepartmentDetailPanel } from "./department-detail-panel";
import { SystemsArchitectWorkspace } from "./systems-architect-workspace";
import { SystemHealthStrip } from "./system-health-strip";
import { CostBreakdownStrip } from "./cost-breakdown-strip";
import { OperationsSummaryStrip } from "./operations-summary-strip";
import { HqFinancialPulse } from "./hq-financial-pulse";
import { HqSecondaryStatusRow } from "./hq-secondary-status-row";
import { HqFinancialTruthStrip } from "./hq-financial-truth-strip";
import { TopEarnersPanel } from "./top-earners-panel";
import {
  TreasuryBudgetConstraintsPanel,
  TreasuryCapitalStrip,
  TreasuryCommitmentsPanel,
  TreasuryTransactionsPanel,
} from "./treasury-capital-strip";
import { TreasuryControlCenter } from "./treasury-control-center";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { HQ_FINANCIAL_TRUTH_ANCHOR, type HqFinancialTruthView } from "@/lib/infinity/financial-truth/types";
import { overlayCanonicalTreasuryOnHqReadModel } from "@/lib/infinity/financial-truth/treasury-overlay";
import { attachFinancialTruthToSnapshot } from "@/lib/infinity/financial-truth/attach-snapshot";
import { buildTreasuryHqArtifacts, replaceTreasuryArtifacts } from "@/lib/infinity/treasury/hq/artifacts";
import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import type { ZtpHqReadModel } from "@/lib/infinity/zero-to-production/hq/read-model";
import { CodingIntelligenceStrip } from "./coding-intelligence-strip";
import { ZtpIntelligenceStrip } from "./ztp-intelligence-strip";
import { CommercializationReadinessStrip } from "./commercialization-readiness-strip";
import { VentureOperatingScaleStrip } from "./venture-operating-scale-strip";
import {
  deriveCommandSystemReadiness,
  findRoomArtifact,
} from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import { useState, useEffect, useCallback, useRef, useId, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HqArtifactInspectorProvider } from "./artifacts/hq-artifact-inspector-provider";
import { ArtifactInspectorModal } from "./artifacts/artifact-inspector-modal";
import { HqInspectionProvider, useHqInspection } from "./hq-inspection-provider";
import { HqInspectionWorkspace } from "./hq-inspection-workspace";
import { INSPECTION_QUERY_PARAM, parseInspectionQuery } from "@/lib/infinity/operator-console/inspection-model";
import { inspectionRefFromVentureId } from "@/lib/infinity/operator-console/inspection-ref";
import {
  hqVentureIdentitiesMatch,
  resolvePreferredVentureIdFromInspect,
} from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  buildHqVentureInspectionHref,
  evaluateHQVenturePollIdentityGate,
  hqVenturePollPath,
  resolveSelectorValue,
  snapshotMatchesRequestedVenture,
  VENTURE_SELECTION_RESOLUTION_FAILED,
} from "@/lib/infinity/hq-venture-selection";
import {
  applyHqCanonicalLiveState,
  liveRoomStatusFromSnapshot,
  shouldFollowFavc1AssemblyNavigation,
} from "@/lib/infinity/operator-console/hq-poll-generation";
import {
  commitHqClientSnapshot,
  nextHqPollRequestSequence,
  restoreHqClientSnapshot,
  unwrapHqPollSnapshot,
} from "@/lib/infinity/operator-console/hq-client-snapshot-commit";
import {
  consumeHqDevClientBuildReload,
  hqBrowserProofHeaders,
  hqDevClientBuildId,
} from "@/lib/infinity/operator-console/local-hq-proof";
import { departmentStateLabel } from "@/lib/infinity/operator-console/status-derivation";
import type { HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { VentureIntelligencePanel } from "./venture-intelligence-panel";
import { inspectedIdentityFromDetail } from "@/lib/infinity/operator-console/inspected-venture-identity";
import type { HqHomeOperatingSummary } from "@/lib/infinity/hq-information-architecture/contract";
import { useHqLiveProjection, type HqLiveDiagnostics } from "./use-hq-live-projection";
import type { HqConnectionStatus } from "@/lib/infinity/operator-console/hq-live-policy";

type Props = {
  ventureId: string;
  initialSnapshot: OperatorVentureSnapshot;
  ventureOptions?: OperatorVentureListItem[];
  portfolioSummary: PortfolioSummary;
  treasurySummary?: TreasuryHqReadModel | null;
  codingSummary?: CodingHqReadModel | null;
  ztpSummary?: ZtpHqReadModel | null;
  favc1CycleMode?: boolean;
  followFavc1Cycle?: boolean;
  intelligenceDetail?: HQEntityDetail | null;
  intelligenceArtifact?: HqWorkArtifact | null;
  intelligenceError?: string | null;
  alwaysShowVentureIntelligence?: boolean;
  operatingSummary?: HqHomeOperatingSummary | null;
};

export function VentureOperatorConsole({
  ventureId,
  initialSnapshot,
  ventureOptions = [],
  portfolioSummary,
  treasurySummary = null,
  codingSummary = null,
  ztpSummary = null,
  favc1CycleMode = false,
  followFavc1Cycle = false,
  intelligenceDetail = null,
  intelligenceArtifact = null,
  intelligenceError = null,
  alwaysShowVentureIntelligence = false,
  operatingSummary = null,
}: Props) {
  return (
    <Suspense fallback={<HqConsolePending snapshot={initialSnapshot} />}>
      <VentureOperatorConsoleInner
        ventureId={ventureId}
        initialSnapshot={initialSnapshot}
        ventureOptions={ventureOptions}
        portfolioSummary={portfolioSummary}
        treasurySummary={treasurySummary}
        codingSummary={codingSummary}
        ztpSummary={ztpSummary}
        favc1CycleMode={favc1CycleMode}
        followFavc1Cycle={followFavc1Cycle}
        intelligenceDetail={intelligenceDetail}
        intelligenceArtifact={intelligenceArtifact}
        intelligenceError={intelligenceError}
        alwaysShowVentureIntelligence={alwaysShowVentureIntelligence}
        operatingSummary={operatingSummary}
      />
    </Suspense>
  );
}

function HqConsolePending({ snapshot }: { snapshot: OperatorVentureSnapshot }) {
  return (
    <div className="infinity-hq space-y-3 overflow-x-hidden">
      <VentureCommandBar
        snapshot={snapshot}
        view="hq"
        onViewChange={() => undefined}
        live
        currentRoom={null}
      />
      <HqFoldSkeleton />
    </div>
  );
}

function VentureOperatorConsoleInner({
  ventureId,
  initialSnapshot,
  ventureOptions = [],
  portfolioSummary,
  treasurySummary = null,
  codingSummary = null,
  ztpSummary = null,
  favc1CycleMode = false,
  followFavc1Cycle = false,
  intelligenceDetail = null,
  intelligenceArtifact = null,
  intelligenceError = null,
  alwaysShowVentureIntelligence = false,
  operatingSummary = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailFromUrl = searchParams.get("detail") ?? searchParams.get("artifact");
  const routeVentureId = resolvePreferredVentureIdFromInspect(
    parseInspectionQuery(searchParams.get(INSPECTION_QUERY_PARAM)),
  );
  const authoritativeVentureId = routeVentureId ?? ventureId;
  const [view, setView] = useState<"hq" | "system">("hq");
  const reactId = useId();
  const mountId = useRef(`hq-mount-${reactId}`);
  const [snapshot, setSnapshot] = useState(() => {
    if (
      routeVentureId &&
      !snapshotMatchesRequestedVenture(initialSnapshot, routeVentureId)
    ) {
      return initialSnapshot;
    }
    return restoreHqClientSnapshot(authoritativeVentureId, initialSnapshot, mountId.current);
  });
  const [treasury, setTreasury] = useState(treasurySummary);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [pollHeartbeat, setPollHeartbeat] = useState({
    at: "",
    seq: 0,
    missionId: "",
    activeCount: snapshot.commandActivity?.counts.activeMissions ?? (snapshot.currentActivity.active ? 1 : 0),
  });
  const appliedFreshness = useRef(snapshot);

  useEffect(() => {
    if (consumeHqDevClientBuildReload()) {
      window.location.reload();
    }
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal, reason: "poll" | "catch-up" = "poll") => {
    const requestSequence = nextHqPollRequestSequence();
    try {
      const headers = {
        ...hqBrowserProofHeaders(),
        "x-hq-catch-up": reason === "catch-up" ? "1" : "0",
      };
      const liveRes = await fetch(
        `/api/operator-console/hq-live-state?ventureId=${encodeURIComponent(authoritativeVentureId)}`,
        {
          cache: "no-store",
          headers,
          signal,
        },
      );
      let liveState: {
        commandActivity: NonNullable<OperatorVentureSnapshot["commandActivity"]>;
        generatedAt: string;
        financialTruth?: OperatorVentureSnapshot["financialTruth"];
        coding?: OperatorVentureSnapshot["coding"];
        capabilities?: OperatorVentureSnapshot["capabilities"];
        ventureOperatingScale?: OperatorVentureSnapshot["ventureOperatingScale"];
        capabilityArtifacts?: OperatorVentureSnapshot["roomArtifacts"];
        canonicalLive?: OperatorVentureSnapshot["canonicalLive"];
        autonomousOperating?: OperatorVentureSnapshot["autonomousOperating"];
      } | null = null;
      if (liveRes.ok) {
        const livePayload = (await liveRes.json()) as {
          commandActivity?: OperatorVentureSnapshot["commandActivity"];
          generatedAt?: string;
          financialTruth?: OperatorVentureSnapshot["financialTruth"];
          coding?: OperatorVentureSnapshot["coding"];
          capabilities?: OperatorVentureSnapshot["capabilities"];
          ventureOperatingScale?: OperatorVentureSnapshot["ventureOperatingScale"];
          capabilityArtifacts?: OperatorVentureSnapshot["roomArtifacts"];
          canonicalLive?: OperatorVentureSnapshot["canonicalLive"];
          autonomousOperating?: OperatorVentureSnapshot["autonomousOperating"];
        };
        if (livePayload.commandActivity && livePayload.generatedAt) {
          liveState = {
            commandActivity: livePayload.commandActivity,
            generatedAt: livePayload.generatedAt,
            financialTruth: livePayload.financialTruth,
            coding: livePayload.coding,
            capabilities: livePayload.capabilities,
            ventureOperatingScale: livePayload.ventureOperatingScale,
            capabilityArtifacts: livePayload.capabilityArtifacts,
            canonicalLive: livePayload.canonicalLive,
            autonomousOperating: livePayload.autonomousOperating,
          };
          const liveDecision = commitHqClientSnapshot({
            ventureId: authoritativeVentureId,
            source: reason === "catch-up" ? "CATCH_UP_RESPONSE" : "POLL_RESPONSE",
            incoming: applyHqCanonicalLiveState(appliedFreshness.current, liveState),
            requestSequence,
            mountId: mountId.current,
          });
          if (liveDecision.accepted) {
            appliedFreshness.current = liveDecision.snapshot;
            setSnapshot(liveDecision.snapshot);
            setPollHeartbeat({
              at: new Date().toISOString(),
              seq: requestSequence,
              missionId:
                liveDecision.snapshot.commandActivity?.systemView.missionId ??
                liveDecision.snapshot.currentExecution?.currentMission ??
                "",
              activeCount:
                liveDecision.snapshot.commandActivity?.counts.activeMissions ??
                (liveDecision.snapshot.currentActivity.active ? 1 : 0),
            });
            setPollError(null);
            setLive(true);
          }
        }
      }
      if (reason === "catch-up" && liveState) return true;

      const endpoint = isFavc1PollingVentureId(authoritativeVentureId)
        ? favc1CyclePollUrl(authoritativeVentureId)
        : hqVenturePollPath(authoritativeVentureId);
      const res = await fetch(endpoint, {
        cache: "no-store",
        headers,
        signal,
      });
      if (!res.ok) {
        if (liveState) return true;
        setPollError(res.status === 404 ? "Venture not found" : "Refresh failed");
        setLive(false);
        return false;
      }
      const payload: unknown = await res.json();
      const pollSnapshot = liveState
        ? applyHqCanonicalLiveState(unwrapHqPollSnapshot(payload), liveState)
        : unwrapHqPollSnapshot(payload);
      const pollIdentity = evaluateHQVenturePollIdentityGate({
        requestedVentureId: authoritativeVentureId,
        responseVentureId: snapshotMatchesRequestedVenture(pollSnapshot, authoritativeVentureId)
          ? authoritativeVentureId
          : pollSnapshot.venture.ventureAssemblyId,
      });
      if (pollIdentity.result !== "PASS") {
        if (liveState) return true;
        setPollError(VENTURE_SELECTION_RESOLUTION_FAILED);
        return false;
      }
      const decision = commitHqClientSnapshot({
        ventureId: authoritativeVentureId,
        source: reason === "catch-up" ? "CATCH_UP_RESPONSE" : "POLL_RESPONSE",
        incoming: pollSnapshot,
        requestSequence,
        mountId: mountId.current,
      });
      if (!decision.accepted) return true;
      appliedFreshness.current = decision.snapshot;
      setSnapshot(decision.snapshot);
      setPollHeartbeat({
        at: new Date().toISOString(),
        seq: requestSequence,
        missionId:
          decision.snapshot.commandActivity?.systemView.missionId ??
          decision.snapshot.currentExecution?.currentMission ??
          "",
        activeCount:
          decision.snapshot.commandActivity?.counts.activeMissions ??
          (decision.snapshot.currentActivity.active ? 1 : 0),
      });
      setPollError(null);
      setLive(true);

      const followVentureAssemblyId =
        payload &&
        typeof payload === "object" &&
        "followVentureAssemblyId" in payload &&
        typeof payload.followVentureAssemblyId === "string"
          ? payload.followVentureAssemblyId
          : null;
      if (
        shouldFollowFavc1AssemblyNavigation({
          followFavc1Cycle,
          liveActiveCount: decision.snapshot.commandActivity?.counts.activeMissions ?? 0,
          followVentureAssemblyId,
          currentVentureId: authoritativeVentureId,
        })
      ) {
        router.push(`/dashboard/ventures/${followVentureAssemblyId}`);
      }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      setPollError("Refresh failed");
      setLive(false);
      return false;
    }
  }, [authoritativeVentureId, followFavc1Cycle, router]);

  const liveTransport = useHqLiveProjection(refresh);

  useEffect(() => {
    const identityChanged = !hqVentureIdentitiesMatch(
      appliedFreshness.current.venture.ventureAssemblyId,
      authoritativeVentureId,
    );
    if (routeVentureId && !snapshotMatchesRequestedVenture(initialSnapshot, routeVentureId)) {
      return;
    }
    const decision = commitHqClientSnapshot({
      ventureId: authoritativeVentureId,
      source: identityChanged ? "IDENTITY_NAVIGATION" : "SSR_PROP_SYNC",
      incoming: initialSnapshot,
      mountId: mountId.current,
    });
    if (!decision.accepted) return;
    appliedFreshness.current = decision.snapshot;
    setSnapshot(decision.snapshot);
  }, [authoritativeVentureId, initialSnapshot, routeVentureId]);

  useEffect(() => {
    setTreasury(treasurySummary);
  }, [treasurySummary]);

  const handleTreasuryChange = useCallback((model: TreasuryHqReadModel, financialTruth?: HqFinancialTruthView) => {
    setTreasury(model);
    const nextTreasuryArtifacts = buildTreasuryHqArtifacts(model);
    setSnapshot((prev) => {
      const patchedBase = {
        ...prev,
        treasury: model,
        roomArtifacts: replaceTreasuryArtifacts(prev.roomArtifacts, nextTreasuryArtifacts),
      };
      const patched = financialTruth ? attachFinancialTruthToSnapshot(patchedBase, financialTruth) : patchedBase;
      const decision = commitHqClientSnapshot({
        ventureId: authoritativeVentureId,
        source: "TREASURY_PATCH",
        incoming: patched,
        mountId: mountId.current,
      });
      return decision.snapshot;
    });
  }, [authoritativeVentureId]);

  const handleVentureChange = (id: string) => {
    const ref = inspectionRefFromVentureId(id);
    if (!ref) return;
    router.push(buildHqVentureInspectionHref(ref, searchParams.toString()), { scroll: false });
  };

  const handleDetailQueryChange = useCallback(
    (detailQuery: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("artifact");
      if (detailQuery) params.set("detail", detailQuery);
      else params.delete("detail");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <HqInspectionProvider snapshot={snapshot}>
    <HqArtifactInspectorProvider
      ventureId={authoritativeVentureId}
      snapshot={snapshot}
      detailQueryParam={detailFromUrl}
      onDetailQueryChange={handleDetailQueryChange}
    >
    <VentureOperatorConsoleBody
      snapshot={snapshot}
      view={view}
      setView={setView}
      ventureOptions={ventureOptions}
      onVentureChange={handleVentureChange}
      live={live && !pollError}
      connectionStatus={liveTransport.connectionStatus}
      lastUpdatedAt={liveTransport.lastUpdatedAt}
      liveDiagnostics={{
        ...liveTransport.diagnostics,
        lastSnapshotAt: liveTransport.diagnostics.lastSnapshotAt ?? snapshot.generatedAt,
        canonicalVersion: snapshot.generatedAt,
      }}
      pollError={pollError}
      selectedDepartment={selectedDepartment}
      setSelectedDepartment={setSelectedDepartment}
      portfolioSummary={portfolioSummary}
      treasury={treasury}
      codingSummary={codingSummary}
      ztpSummary={ztpSummary}
      onTreasuryChange={handleTreasuryChange}
      intelligenceDetail={
        !routeVentureId || snapshotMatchesRequestedVenture(snapshot, routeVentureId)
          ? intelligenceDetail
          : null
      }
      intelligenceArtifact={
        !routeVentureId || snapshotMatchesRequestedVenture(snapshot, routeVentureId)
          ? intelligenceArtifact
          : null
      }
      intelligenceError={
        routeVentureId && !snapshotMatchesRequestedVenture(snapshot, routeVentureId)
          ? null
          : intelligenceError
      }
      authoritativeVentureId={authoritativeVentureId}
      alwaysShowVentureIntelligence={alwaysShowVentureIntelligence}
      operatingSummary={operatingSummary}
      pollHeartbeat={pollHeartbeat}
    />
      <ArtifactInspectorModal />
      <HqInspectionWorkspaceBridge snapshot={snapshot} />
    </HqArtifactInspectorProvider>
    </HqInspectionProvider>
  );
}

function HqInspectionWorkspaceBridge({ snapshot }: { snapshot: OperatorVentureSnapshot }) {
  const inspection = useHqInspection();
  return (
    <HqInspectionWorkspace
      snapshot={snapshot}
      context={inspection.context}
      systemsView={inspection.systemsArchitectView}
      open={inspection.workspaceOpen}
      onClose={inspection.closeInspectionWorkspace}
    />
  );
}

function VentureOperatorConsoleBody({
  snapshot,
  view,
  setView,
  ventureOptions,
  onVentureChange,
  live,
  connectionStatus,
  lastUpdatedAt,
  liveDiagnostics,
  pollError,
  selectedDepartment,
  setSelectedDepartment,
  portfolioSummary,
  treasury,
  codingSummary,
  ztpSummary,
  onTreasuryChange,
  intelligenceDetail,
  intelligenceArtifact,
  intelligenceError,
  authoritativeVentureId,
  alwaysShowVentureIntelligence,
  operatingSummary,
  pollHeartbeat,
}: {
  snapshot: OperatorVentureSnapshot;
  view: "hq" | "system";
  setView: (view: "hq" | "system") => void;
  ventureOptions: OperatorVentureListItem[];
  onVentureChange: (id: string) => void;
  live: boolean;
  connectionStatus: HqConnectionStatus;
  lastUpdatedAt: string | null;
  liveDiagnostics?: HqLiveDiagnostics;
  pollError: string | null;
  selectedDepartment: DepartmentId | null;
  setSelectedDepartment: (id: DepartmentId | null) => void;
  portfolioSummary: PortfolioSummary;
  treasury: TreasuryHqReadModel | null;
  codingSummary: CodingHqReadModel | null;
  ztpSummary: ZtpHqReadModel | null;
  onTreasuryChange: (model: TreasuryHqReadModel, financialTruth?: HqFinancialTruthView) => void;
  intelligenceDetail: HQEntityDetail | null;
  intelligenceArtifact: HqWorkArtifact | null;
  intelligenceError: string | null;
  authoritativeVentureId: string;
  alwaysShowVentureIntelligence: boolean;
  operatingSummary?: HqHomeOperatingSummary | null;
  pollHeartbeat: { at: string; seq: number; missionId: string; activeCount: number };
}) {
  const inspection = useHqInspection();
  const selected = snapshot.departments.find((d) => d.id === selectedDepartment) ?? null;
  const systemsArchitectView = inspection.systemsArchitectView;
  const showVentureIntelligence = alwaysShowVentureIntelligence || inspection.context.explicit;

  useEffect(() => {
    if (selectedDepartment !== "systems_architect") return;
    document.getElementById("systems-architect-workspace")?.scrollIntoView({ block: "nearest" });
  }, [selectedDepartment]);

  const inspecting = snapshot.commandActivity?.nowInspecting;
  const floorHasLiveWork =
    (snapshot.commandActivity?.counts.activeMissions ?? 0) > 0 ||
    inspecting?.status === "ACTIVE_WORK" ||
    inspecting?.status === "READY_BLOCKED" ||
    inspecting?.status === "WAITING_EXTERNAL" ||
    inspecting?.status === "WAITING_INTERNAL";
  const liveWorkTitle = floorHasLiveWork
    ? snapshot.commandActivity?.nowInspecting.currentMission ?? null
    : null;
  const inspectionKey = inspection.context.explicit
    ? `${inspection.context.entityType}:${inspection.context.entityId}`
    : null;
  const skipInitialInspectScroll = useRef(true);
  useEffect(() => {
    if (skipInitialInspectScroll.current) {
      skipInitialInspectScroll.current = false;
      return;
    }
    if (!inspectionKey) return;
    document.getElementById("venture-intelligence")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [inspectionKey]);

  return (
    <div
      className="infinity-hq space-y-3 overflow-x-hidden"
      key={process.env.NODE_ENV !== "production" ? hqDevClientBuildId() || undefined : undefined}
      data-hq-committed-active={snapshot.commandActivity?.counts.activeMissions ?? (snapshot.currentActivity.active ? 1 : 0)}
      data-hq-committed-mission={liveWorkTitle ?? ""}
      data-hq-current-work-id={
        snapshot.commandActivity?.nowInspecting.currentWorkId
        ?? snapshot.commandActivity?.systemView.artifactId
        ?? ""
      }
      {...(process.env.NODE_ENV !== "production"
        ? {
            "data-hq-client-build": hqDevClientBuildId(),
            "data-hq-last-poll-at": pollHeartbeat.at,
            "data-hq-last-poll-seq": String(pollHeartbeat.seq),
            "data-hq-current-mission-id":
              pollHeartbeat.missionId ||
              snapshot.commandActivity?.systemView.missionId ||
              snapshot.commandActivity?.nowInspecting.currentMission ||
              "",
            "data-hq-active-count": String(
              snapshot.commandActivity?.counts.activeMissions ??
                (snapshot.currentActivity.active ? 1 : 0),
            ),
          }
        : {})}
    >
      <VentureCommandBar
        snapshot={snapshot}
        view={view}
        onViewChange={setView}
        live={live}
        connectionStatus={connectionStatus}
        lastUpdatedAt={lastUpdatedAt}
        liveDiagnostics={liveDiagnostics}
        currentRoom={selectedDepartment}
      />
      {view === "hq" ? <HqFinancialPulse view={snapshot.financialTruth} /> : null}

      {pollError ? (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="alert">
          {pollError} — showing last known state
        </p>
      ) : null}

      {view === "hq" ? (
        <>
          <div className="space-y-2.5" data-hq-region="executive">
            <div data-hq-region="command" id="hq-command">
              <p className="hq-command-kicker px-1">HQ Command</p>
              <CommandChamber
                snapshot={snapshot.departments.find((d) => d.id === "executive_office")}
                workerNodes={snapshot.workerNodes ?? []}
                currentActivity={snapshot.currentActivity}
                closedLoopRoute={snapshot.closedLoopRoute}
                isSelected={selectedDepartment === "executive_office"}
                onSelect={() => setSelectedDepartment("executive_office")}
                cycleMeta={snapshot.favc1Cycle ?? null}
                ventureName={snapshot.venture.ventureName}
                commandActivity={snapshot.commandActivity ?? null}
                autonomousOperating={snapshot.autonomousOperating ?? null}
                hqSystemState={
                  typeof snapshot.departments.find((d) => d.id === "operations")?.detail?.systemState === "string"
                    ? String(snapshot.departments.find((d) => d.id === "operations")?.detail?.systemState)
                    : null
                }
                waitingWork={Boolean(snapshot.departments.find((d) => d.id === "operations")?.detail?.scheduled)}
                systemReadiness={deriveCommandSystemReadiness({
                  snapshot,
                  treasury: treasury,
                  coding: codingSummary,
                })}
              />
            </div>
            <HqSecondaryStatusRow
              summary={operatingSummary}
              mailbox={snapshot.communicationIntelligence?.mailboxObserver}
            />
            <HqSpatialFloor
              departments={snapshot.departments}
              workerNodes={snapshot.workerNodes ?? []}
              currentActivity={snapshot.currentActivity}
              activeDepartments={snapshot.currentDepartments}
              closedLoopRoute={snapshot.closedLoopRoute}
              selectedDepartment={selectedDepartment}
              onSelectDepartment={setSelectedDepartment}
              handoffStage={snapshot.handoffStage ?? null}
              handoffLineageColorKey={snapshot.handoffLineageColorKey ?? null}
              ventureName={snapshot.venture.ventureName}
              liveRoomStatus={liveRoomStatusFromSnapshot(snapshot)}
              currentWorkTitle={liveWorkTitle}
              lastVentureWorkTitle={floorHasLiveWork ? null : snapshot.commandActivity?.latestVentureWork?.title ?? null}
              nowInspectingTask={
                floorHasLiveWork
                  ? inspecting?.currentTask ?? inspecting?.currentStep ?? null
                  : null
              }
              isTerminalCycle={
                Boolean(snapshot.favc1Cycle?.terminalOutcome) &&
                snapshot.favc1Cycle?.terminalOutcome !== "RUNNING"
              }
            />
          </div>

          <SystemsArchitectWorkspace
            open={selectedDepartment === "systems_architect"}
            view={systemsArchitectView}
            onClose={() => setSelectedDepartment(null)}
          />
        </>
      ) : (
        <SystemView
          snapshot={snapshot}
          portfolioSummary={portfolioSummary}
          intelligenceError={intelligenceError}
        />
      )}

      <div
        id="venture-intelligence"
        className="hq-venture-stack space-y-2"
        data-hq-region="venture-stack"
      >
        <div className="hq-venture-inspection-divider">
          <p className="hq-command-kicker">Venture inspection</p>
          <a href="#hq-command" className="hq-back-to-command">
            Back to Command ↑
          </a>
        </div>
        {showVentureIntelligence ? (
          <>
            <InspectionContextBar
              context={inspection.context}
              onClear={inspection.clearInspection}
              overallStatus={departmentStateLabel(snapshot.overallStatus)}
              nowInspecting={snapshot.commandActivity?.nowInspecting ?? null}
              canonicalVenture={{
                name:
                  snapshotMatchesRequestedVenture(snapshot, authoritativeVentureId)
                    ? snapshot.venture.ventureName
                    : inspection.context.displayName ?? snapshot.venture.ventureName,
                id: authoritativeVentureId || snapshot.venture.ventureAssemblyId,
                originLabel: snapshot.venture.origin ?? snapshot.venture.ventureType,
              }}
              identity={inspectedIdentityFromDetail(intelligenceDetail)}
              selector={
                ventureOptions.length > 0 ? (
                  <VentureSelector
                    ventures={ventureOptions}
                    currentVentureId={resolveSelectorValue(
                      ventureOptions,
                      authoritativeVentureId || inspection.context.entityId || snapshot.venture.ventureAssemblyId,
                    )}
                    onVentureChange={onVentureChange}
                    hideStatus
                  />
                ) : null
              }
            />
            <VentureIntelligencePanel
              detail={intelligenceDetail}
              artifact={intelligenceArtifact}
              error={intelligenceError}
            />
          </>
        ) : (
          <section
            className="hq-venture-placeholder"
            data-hq-region="inspecting"
            data-hq-venture-placeholder="true"
          >
            <p className="hq-inspection-kicker">Venture inspection</p>
            <p className="mt-1 text-sm text-zinc-300">Select a venture from Command to inspect it.</p>
          </section>
        )}
      </div>

      {view === "hq" ? (
        <>
          <div id={HQ_FINANCIAL_TRUTH_ANCHOR} data-hq-region="financial-truth">
            <HqFinancialTruthStrip view={snapshot.financialTruth} />
          </div>
          <div className="space-y-3 border-t border-zinc-800/60 pt-4" data-hq-region="infrastructure">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600">System Infrastructure</p>
            {treasury ? (
              <TreasuryCapitalStrip
                model={
                  snapshot.financialTruth?.treasury_control
                    ? overlayCanonicalTreasuryOnHqReadModel(treasury, snapshot.financialTruth.treasury_control)
                    : treasury
                }
                inspectArtifact={findRoomArtifact(snapshot, "treasury_state")}
              />
            ) : null}
            {(snapshot.coding ?? codingSummary) ? (
              <CodingIntelligenceStrip
                model={snapshot.coding ?? codingSummary!}
                inspectArtifact={
                  findRoomArtifact(snapshot, "coding_agent_run") ?? findRoomArtifact(snapshot, "coding_provider")
                }
              />
            ) : null}
            <CommercializationReadinessStrip
              snapshot={snapshot}
              inspectArtifact={
                findRoomArtifact(snapshot, "commercial_domain") ??
                findRoomArtifact(snapshot, "commercial_payment") ??
                findRoomArtifact(snapshot, "commercial_treasury")
              }
            />
            <VentureOperatingScaleStrip snapshot={snapshot} />
            {ztpSummary ? (
              <ZtpIntelligenceStrip
                model={ztpSummary}
                inspectArtifact={findRoomArtifact(snapshot, "ztp_run")}
              />
            ) : null}
            <SystemHealthStrip snapshot={snapshot} />
            <TopEarnersPanel summary={portfolioSummary} />
            {treasury ? (
              <>
                <TreasuryControlCenter
                  model={
                    snapshot.financialTruth?.treasury_control
                      ? overlayCanonicalTreasuryOnHqReadModel(treasury, snapshot.financialTruth.treasury_control)
                      : treasury
                  }
                  financialTruth={snapshot.financialTruth}
                  ventureOptions={ventureOptions}
                  onModelChange={onTreasuryChange}
                />
                <TreasuryBudgetConstraintsPanel
                  model={
                    snapshot.financialTruth?.treasury_control
                      ? overlayCanonicalTreasuryOnHqReadModel(treasury, snapshot.financialTruth.treasury_control)
                      : treasury
                  }
                />
                <TreasuryTransactionsPanel
                  model={
                    snapshot.financialTruth?.treasury_control
                      ? overlayCanonicalTreasuryOnHqReadModel(treasury, snapshot.financialTruth.treasury_control)
                      : treasury
                  }
                />
                <TreasuryCommitmentsPanel
                  model={
                    snapshot.financialTruth?.treasury_control
                      ? overlayCanonicalTreasuryOnHqReadModel(treasury, snapshot.financialTruth.treasury_control)
                      : treasury
                  }
                  emptyLabel="No active commitments."
                />
              </>
            ) : null}
            <OperationsSummaryStrip snapshot={snapshot} />

            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <CostBreakdownStrip departments={snapshot.departments} costs={snapshot.costs} />
                <CurrentActivityBar activity={snapshot.currentActivity} />
                <ActivityFeedPanel events={snapshot.activityFeed} />
              </div>
              <DepartmentDetailPanel
                department={selected}
                providers={snapshot.providers}
                workerNodes={snapshot.workerNodes ?? []}
                costs={snapshot.costs}
                architectureWorkspaceOpen={selectedDepartment === "systems_architect"}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
