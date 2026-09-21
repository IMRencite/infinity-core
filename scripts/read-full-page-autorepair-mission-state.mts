import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { refreshMissionActivityFromDisk } from "../lib/infinity/mission-activity/store.ts";
import { projectCommandActivity } from "../lib/infinity/mission-activity/project.ts";
import { listMissionActivityEvents } from "../lib/infinity/mission-activity/store.ts";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence.ts";
import {
  fullPageAutorepairActivationMutationsConsumed,
  getCanonicalActivePublicValidationState,
} from "../lib/infinity/market-validation-experiment/active-public-artifact.ts";
import {
  fullPageAutorepairAuthorizationAlreadyConsumed,
} from "../lib/infinity/market-validation-experiment/cre-full-page-autorepair-authorization.ts";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();
refreshMissionActivityFromDisk();

const successor = JSON.parse(readFileSync(".infinity/full-page-autorepair-successor.json", "utf8")) as {
  missionId: string;
  predecessorMission: string;
  artifactId: string;
  digest: string;
  routes: number;
  predecessorArtifactId: string;
  predecessorDigest: string;
  founderVisualReviewReady: string;
  lockedDigest: string;
  digestMatchesLock: boolean;
  pageLoop: {
    overall: string;
    rendered: number;
    validated: number;
    passedFirstAttempt: number;
    requiredRepair: number;
    pagesRepaired: number;
    totalRepairIterations: number;
    repairCeilingExceeded: number;
    finalFailed: number;
    missingEvidence: number;
    promotion?: { readyForArtifact?: number; overall?: string };
    fullRoute?: { overall?: string };
    humanFirstRemaining?: number;
    contrast?: Record<string, unknown>;
    records?: Array<{
      route: string;
      finalState: string;
      families?: string[];
      contrast?: { text?: string; links?: string; sameColor?: number; missing?: number };
    }>;
    files: Array<{ path: string; content: string }>;
  };
};

const loop = successor.pageLoop;
const files = loop.files ?? [];
const pricing = files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
const pkg = files.find((file) => file.path.replace(/\\/g, "/") === "package.json")?.content ?? "";
const cam = files.find((file) =>
  file.path.replace(/\\/g, "/").endsWith("app/commercial-lease-npv/should-cam-be-in-lease-npv/page.tsx"),
)?.content ?? "";
const footer = files.find((file) => /venture-footer/.test(file.path.replace(/\\/g, "/")))?.content ?? "";

const events = listMissionActivityEvents({
  organizationId: LIVE_ORG,
  missionId: "msn_cre_full_page_autorepair_deploy_v1",
});
const view = projectCommandActivity({ organizationId: LIVE_ORG });
const deploy = JSON.parse(readFileSync(".infinity/full-page-autorepair-deploy-result.json", "utf8"));

process.stdout.write(
  `${JSON.stringify(
    {
      missionEvents: events.map((event) => ({
        eventType: event.eventType,
        status: event.status,
        stepType: event.stepType,
        summary: event.summary,
        blocker: event.blocker,
        authorizationRequired: event.authorizationRequired,
        observedAt: event.observedAt,
      })),
      hq: {
        currentMission: view.nowInspecting.currentMission,
        status: view.nowInspecting.status,
        currentTask: view.nowInspecting.currentTask,
        currentPhase: view.nowInspecting.currentPhase,
        blocker: view.nowInspecting.blocker,
        authorizationRequired: view.nowInspecting.authorizationRequired,
        counts: view.counts,
        rooms: Object.fromEntries(
          Object.entries(view.rooms).map(([id, room]) => [id, { status: room.status, summary: room.summary }]),
        ),
        latestCompleted: view.latestCompleted?.missionType ?? null,
        commandNow: view.rooms.executive_office?.summary ?? null,
      },
      successor: {
        missionId: successor.missionId,
        predecessorMission: successor.predecessorMission,
        artifactId: successor.artifactId,
        digest: successor.digest,
        routes: successor.routes,
        predecessorArtifactId: successor.predecessorArtifactId,
        predecessorDigest: successor.predecessorDigest,
        digestMatchesLock: successor.digestMatchesLock,
        founderVisualReviewReady: successor.founderVisualReviewReady,
        pageLoop: {
          overall: loop.overall,
          rendered: loop.rendered,
          validated: loop.validated,
          passedFirstAttempt: loop.passedFirstAttempt,
          requiredRepair: loop.requiredRepair,
          pagesRepaired: loop.pagesRepaired,
          totalRepairIterations: loop.totalRepairIterations,
          repairCeilingExceeded: loop.repairCeilingExceeded,
          finalFailed: loop.finalFailed,
          missingEvidence: loop.missingEvidence,
          promotion: loop.promotion,
          fullRoute: loop.fullRoute,
          humanFirstRemaining: loop.humanFirstRemaining,
          contrast: loop.contrast,
          recordCount: loop.records?.length ?? 0,
          readyForArtifact: loop.records?.filter((record) => record.finalState === "READY_FOR_ARTIFACT").length ?? null,
        },
      },
      pricingUsesOptimistic: /useOptimistic/.test(pricing),
      pricingClient: /["']use client["']/.test(pricing),
      pricingHead: pricing.slice(0, 800),
      packageJson: pkg,
      camHasTrustedSources: /Trusted Sources|trusted-sources|authority-sources/i.test(cam),
      footerVenture: /An Infinity OS Venture/.test(footer),
      footerInfinite: /An Infinite OS Venture/.test(footer),
      deploy,
      authorizationConsumed: fullPageAutorepairAuthorizationAlreadyConsumed(),
      activationAttempts: fullPageAutorepairActivationMutationsConsumed(),
      active: getCanonicalActivePublicValidationState(),
      observer: inspectMailboxObserverHealth(),
      experiment: inspectRealMarketEvidence().experiment,
      clock: inspectExperimentClock(),
    },
    null,
    2,
  )}\n`,
);
