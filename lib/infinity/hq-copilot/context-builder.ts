import { buildRoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import type {
  DepartmentId,
  OperatorVentureListItem,
  OperatorVentureSnapshot,
} from "@/lib/infinity/operator-console/types";
import type { PortfolioSummary } from "@/lib/infinity/operator-console/portfolio/portfolio-types";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import type { CommercialProviderVerification } from "@/lib/infinity/commercialization/probes/status";
import type { ProviderInventory } from "@/lib/infinity/commercialization/probes/inventory";
import type { HqCopilotQuery } from "./types";
import { MAX_COPILOT_CONTEXT_CHARS } from "./types";
import type { HqCopilotIntent } from "./types";
import type { HqCopilotRouteResult } from "./query-router";
import { sourceRef, uniqueSources } from "./sources";
import type { HqCopilotSource } from "./types";
import { clampCopilotText } from "./sanitize";

export type HqCopilotReadRuntime = {
  loadPortfolio: (organizationId: string) => Promise<PortfolioSummary>;
  loadVentureList: (organizationId: string) => Promise<OperatorVentureListItem[]>;
  loadVentureSnapshot: (organizationId: string, ventureId: string) => Promise<OperatorVentureSnapshot | null>;
  loadTreasury: (organizationId: string) => Promise<TreasuryHqReadModel>;
  loadProviderVerifications: (organizationId: string) => Promise<CommercialProviderVerification[]>;
  loadProviderInventory: () => ProviderInventory;
};

export type HqCopilotContextPackage = {
  organizationId: string;
  currentVentureId: string | null;
  currentRoom: DepartmentId | null;
  portfolio: PortfolioSummary | null;
  ventureList: OperatorVentureListItem[];
  currentVenture: OperatorVentureSnapshot | null;
  comparedVentures: OperatorVentureSnapshot[];
  treasury: TreasuryHqReadModel | null;
  providerInventory: ProviderInventory | null;
  providerVerifications: CommercialProviderVerification[];
  facts: string[];
  sources: HqCopilotSource[];
  factText: string;
  scopeNote: string | null;
};

function needsPortfolio(intent: string): boolean {
  return [
    "PORTFOLIO_STATUS",
    "VENTURE_READINESS",
    "PERFORMANCE_STATUS",
    "COMPARE_EXISTING_METRICS",
    "GENERAL_HQ_SUMMARY",
  ].includes(intent);
}

function needsVenture(intent: string): boolean {
  return [
    "VENTURE_STATUS",
    "VENTURE_BLOCKERS",
    "VENTURE_READINESS",
    "ROOM_STATUS",
    "ROOM_ACTIVITY",
    "MISSION_STATUS",
    "VALIDATION_STATUS",
    "RESEARCH_EVIDENCE",
    "MONETIZATION_STATUS",
    "BUILD_STATUS",
    "ARTIFACT_STATUS",
    "EXISTING_DECISION_EXPLANATION",
    "TRACE_LINEAGE",
    "TREASURY_STATUS",
    "GENERAL_HQ_SUMMARY",
  ].includes(intent);
}

function needsTreasury(intent: string): boolean {
  return intent === "TREASURY_STATUS" || intent === "GENERAL_HQ_SUMMARY";
}

function needsProviders(intent: string): boolean {
  return intent === "PROVIDER_STATUS" || intent === "VENTURE_READINESS" || intent === "GENERAL_HQ_SUMMARY";
}

function matchVentureName(list: OperatorVentureListItem[], question: string): string[] {
  const lower = question.toLowerCase();
  return list
    .filter((item) => {
      const names = [item.ventureName, item.ventureDisplayName, item.ventureDisplayLabel].filter(Boolean) as string[];
      return names.some((name) => name.length >= 2 && lower.includes(name.toLowerCase()));
    })
    .map((item) => item.ventureAssemblyId);
}

export async function buildHqCopilotContext(input: {
  query: HqCopilotQuery;
  route: HqCopilotRouteResult;
  runtime: HqCopilotReadRuntime;
}): Promise<HqCopilotContextPackage> {
  const { query, route, runtime } = input;
  const orgId = query.organizationId;
  const intent: HqCopilotIntent = route.intent;
  if (intent === "FORBIDDEN_ACTION") {
    return {
      organizationId: orgId,
      currentVentureId: query.currentVentureId ?? null,
      currentRoom: query.currentRoom ?? null,
      portfolio: null,
      ventureList: [],
      currentVenture: null,
      comparedVentures: [],
      treasury: null,
      providerInventory: null,
      providerVerifications: [],
      facts: [],
      sources: [],
      factText: "",
      scopeNote: null,
    };
  }
  const sources: HqCopilotSource[] = [];
  const facts: string[] = [];

  const ventureList = needsVenture(intent) || needsPortfolio(intent) ? await runtime.loadVentureList(orgId) : [];
  const namedIds = matchVentureName(ventureList, query.question);
  const usesDeixis = /\b(this|us|our|current)\b/i.test(query.question);
  let currentVentureId: string | null =
    namedIds[0] ??
    (usesDeixis || needsVenture(intent) ? query.currentVentureId ?? null : null);

  if (intent === "PORTFOLIO_STATUS" && !usesDeixis && namedIds.length === 0) {
    currentVentureId = null;
  }

  const currentRoom = "roomId" in route ? (route.roomId ?? query.currentRoom ?? null) : (query.currentRoom ?? null);

  let portfolio: PortfolioSummary | null = null;
  if (needsPortfolio(intent)) {
    portfolio = await runtime.loadPortfolio(orgId);
    sources.push(sourceRef("PORTFOLIO", "Portfolio"));
    const active = portfolio.ventures.filter((v) => v.isActive && !v.excludedFromPortfolio);
    facts.push(
      `Portfolio has ${active.length} active venture(s) of ${portfolio.totalVenturesBuilt} built.`,
    );
    if (active.length) {
      facts.push(`Active ventures: ${active.map((v) => v.ventureName).join(", ")}.`);
    } else {
      facts.push("No active ventures are currently recorded.");
    }
    if (portfolio.topVenture) {
      facts.push(
        `Recorded top performer is ${portfolio.topVenture.ventureName} (${portfolio.topVenture.displayLabel}).`,
      );
      sources.push(sourceRef("PERFORMANCE_OBSERVATION", "Performance Intelligence", portfolio.topVenture.ventureAssemblyId));
    }
  }

  let currentVenture: OperatorVentureSnapshot | null = null;
  const comparedVentures: OperatorVentureSnapshot[] = [];

  if (intent === "COMPARE_EXISTING_METRICS") {
    const compareIds = namedIds.slice(0, 4);
    for (const id of compareIds) {
      const snap = await runtime.loadVentureSnapshot(orgId, id);
      if (snap && snap.venture.organizationId === orgId) comparedVentures.push(snap);
    }
    if (portfolio) {
      for (const row of portfolio.ventures) {
        if (!namedIds.includes(row.ventureAssemblyId) && !compareIds.includes(row.ventureAssemblyId)) continue;
        facts.push(
          `${row.ventureName}: recorded revenue ${row.revenueUsd ?? "UNKNOWN"}, known costs ${row.knownCostsUsd ?? "UNKNOWN"}, profit ${row.profitUsd ?? "UNKNOWN"}. Gross margin is not a recorded field.`,
        );
        sources.push(sourceRef("VENTURE", row.ventureName, row.ventureAssemblyId));
      }
    }
  } else if (needsVenture(intent) && currentVentureId) {
    currentVenture = await runtime.loadVentureSnapshot(orgId, currentVentureId);
    if (currentVenture && currentVenture.venture.organizationId !== orgId) {
      currentVenture = null;
    }
    if (currentVenture) {
      sources.push(sourceRef("VENTURE", currentVenture.venture.ventureName, currentVenture.venture.ventureAssemblyId));
      facts.push(
        `Current venture is ${currentVenture.venture.ventureName} with overall status ${currentVenture.overallStatus} and readiness ${currentVenture.venture.readinessStatus ?? "UNKNOWN"}.`,
      );
      const blocked = currentVenture.departments.filter((d) => d.state === "BLOCKED" || d.state === "FAILED");
      if (blocked.length) {
        facts.push(
          `Recorded blockers: ${blocked.map((d) => `${getRoomDisplayNames(d.id).displayName} is ${d.state}${d.summary ? ` (${d.summary})` : ""}`).join("; ")}.`,
        );
      } else if (intent === "VENTURE_BLOCKERS") {
        facts.push("No blocking or failed rooms are currently recorded for this venture.");
      }
      if (currentVenture.closedLoopRoute.decisionType) {
        facts.push(
          `Existing recorded decision type is ${currentVenture.closedLoopRoute.decisionType} with mission status ${currentVenture.closedLoopRoute.missionStatus ?? "UNKNOWN"}.`,
        );
        sources.push(sourceRef("DECISION", "Existing system decision", currentVenture.closedLoopRoute.missionId ?? undefined));
      }
      if (currentVenture.closedLoopRoute.missionId) {
        sources.push(sourceRef("MISSION", "Current mission", currentVenture.closedLoopRoute.missionId));
      }
      const research = currentVenture.departments.find((d) => d.id === "research_department");
      if (research) {
        facts.push(
          `Research Grid status is ${research.state}${research.summary ? `: ${research.summary}` : ""}.`,
        );
        sources.push(sourceRef("RESEARCH_EVIDENCE", "Research Grid"));
      }
      const validation = currentVenture.departments.find((d) => d.id === "quality_control");
      if (validation) {
        facts.push(
          `Validation Station status is ${validation.state}${validation.displayTask ? `: ${validation.displayTask}` : validation.currentTask ? `: ${validation.currentTask}` : ""}.`,
        );
        sources.push(sourceRef("VALIDATION_RESULT", "Validation Station"));
      }
      const strategy = currentVenture.departments.find((d) => d.id === "strategy_finance");
      if (strategy) {
        facts.push(
          `Profit Lab / monetization status is ${strategy.state}${strategy.summary ? `: ${strategy.summary}` : ""}.`,
        );
        sources.push(sourceRef("MONETIZATION_RESULT", "Profit Lab"));
      }
      const product = currentVenture.departments.find((d) => d.id === "product_lab");
      const artifacts = currentVenture.system.artifacts;
      const pab = Array.isArray(artifacts.pab) ? artifacts.pab : [];
      const production = Array.isArray(artifacts.production) ? artifacts.production : [];
      if (product) {
        facts.push(`Creation Lab status is ${product.state}. Recorded production artifacts: ${production.length}. PAB artifacts: ${pab.length}.`);
        sources.push(sourceRef("BUILD", "Creation Lab"));
      }
      if (query.selectedArtifactId) {
        const roomArtifacts = Object.values(currentVenture.roomArtifacts ?? {}).flat();
        const selected = roomArtifacts.find((artifact) => artifact.id === query.selectedArtifactId);
        if (selected) {
          facts.push(`Selected artifact is ${selected.title} (${selected.artifactType}, ${selected.state}).`);
          sources.push(sourceRef("ARTIFACT", selected.title, selected.id));
        } else {
          facts.push("The selected artifact is not present in this venture's recorded HQ artifacts.");
        }
      }
      const lineageLabels = currentVenture.lineage.slice(0, 8).map((n) => n.label);
      if (lineageLabels.length) {
        facts.push(`Recorded lineage: ${lineageLabels.join(" → ")}.`);
      }
      const feed = currentVenture.activityFeed[0];
      if (feed) {
        facts.push(`Latest recorded activity: ${feed.displaySummary ?? feed.summary} (${feed.displayStatus ?? feed.status ?? "UNKNOWN"}).`);
      }

      const room = currentRoom ? currentVenture.departments.find((d) => d.id === currentRoom) : null;
      if (room) {
        const names = getRoomDisplayNames(room.id);
        const activity = buildRoomActivityExplanation({
          departmentId: room.id,
          department: room,
          workerNodes: currentVenture.workerNodes ?? [],
          providers: currentVenture.providers,
          currentActivity: currentVenture.currentActivity,
          closedLoopRoute: currentVenture.closedLoopRoute,
          ventureName: currentVenture.venture.ventureName,
          ventureId: currentVenture.venture.ventureAssemblyId,
        });
        facts.push(
          `${names.displayName} is ${room.state}. Current recorded activity: ${activity.sentence}`,
        );
        sources.push(sourceRef("HQ_ROOM", names.displayName, room.id));
      }
    }
  }

  let treasury: TreasuryHqReadModel | null = null;
  if (needsTreasury(intent)) {
    treasury = await runtime.loadTreasury(orgId);
    if (treasury.organizationId === orgId) {
      sources.push(sourceRef("TREASURY_RECORD", "Treasury"));
      facts.push(
        `Treasury available capital is ${treasury.cards.availableCapital.display}; allocated capital is ${treasury.cards.infinityAllocatedCapital.display}. Mercury live credentials are out of scope.`,
      );
      if (currentVenture) {
        const row = treasury.ventures.find((v) => v.ventureId === currentVenture.venture.ventureAssemblyId);
        if (row) {
          facts.push(
            `Recorded allocation for ${currentVenture.venture.ventureName}: allocated ${row.allocated.display}, spent ${row.spent.display}, available ${row.available.display}.`,
          );
        } else if (intent === "TREASURY_STATUS") {
          facts.push("No Treasury allocation row is recorded for the current venture.");
        }
      }
    } else {
      treasury = null;
    }
  }

  let providerInventory: ProviderInventory | null = null;
  let providerVerifications: CommercialProviderVerification[] = [];
  if (needsProviders(intent)) {
    providerInventory = runtime.loadProviderInventory();
    providerVerifications = (await runtime.loadProviderVerifications(orgId)).filter(
      (row) => row.organizationId === orgId,
    );
    const entries: Array<{ label: string; key: keyof ProviderInventory }> = [
      { label: "Cloudflare", key: "dns" },
      { label: "Namecheap", key: "registrar" },
      { label: "Vercel", key: "hosting" },
      { label: "Stripe", key: "payments" },
    ];
    for (const entry of entries) {
      const inv = providerInventory[entry.key];
      const verification = providerVerifications.find((v) => v.providerKey === inv.providerKey);
      facts.push(
        `${entry.label} inventory is ${inv.configured}; recorded verification status is ${verification?.status ?? "NOT_CONFIGURED"}. Mutation authority is locked. Mercury is out of scope.`,
      );
      sources.push(sourceRef("PROVIDER_VERIFICATION", `${entry.label} readiness`, verification?.id));
    }
  }

  facts.push("CAC / customer acquisition cost is not present unless explicitly listed above.");
  facts.push("Do not recommend funding, killing, launching, or prioritizing ventures.");

  const factText = clampCopilotText(facts.join("\n"), MAX_COPILOT_CONTEXT_CHARS);
  let scopeNote: string | null = null;
  if (needsVenture(intent) && !currentVenture && namedIds.length === 0 && !query.currentVentureId && intent !== "PORTFOLIO_STATUS") {
    scopeNote = "No current venture is selected, so venture-specific questions cannot be resolved.";
  }

  return {
    organizationId: orgId,
    currentVentureId: currentVenture?.venture.ventureAssemblyId ?? currentVentureId,
    currentRoom,
    portfolio,
    ventureList,
    currentVenture,
    comparedVentures,
    treasury,
    providerInventory,
    providerVerifications,
    facts,
    sources: uniqueSources(sources),
    factText,
    scopeNote,
  };
}
