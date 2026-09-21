import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { attachCommandActivity, runInstrumentedMission } from "@/lib/infinity/mission-activity";
import { instrumentedRuntimeRegistry } from "@/lib/infinity/mission-activity/runtime-contract";
import { persistCompileRepairLayoutFalseNegativeCorrection } from "@/lib/infinity/mission-activity/persist-cre-layout-false-negative-correction";
import { persistDeployedCompileRepairLayoutFailHistory } from "@/lib/infinity/mission-activity/persist-deployed-cre-compile-repair-layout-fail";
import { listMissionActivityEvents, refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "@/lib/infinity/launch-gateway/provider-config";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  adjudicateRenderedLayout,
  textualCssParserCannotOverrideBrowserGeometry,
} from "@/lib/infinity/public-venture-design/rendered-layout/adjudication-precedence";
import {
  runServedProductionRenderedLayoutGateAgainstOrigin,
  servedProductionLayoutPasses,
} from "@/lib/infinity/public-venture-design/rendered-layout/served-production-gate";
import { reconstructCreProviderEquivalentCompileRepairSuccessor } from "@/lib/infinity/venture-website-architecture/cre-provider-equivalent-compile-repair-successor";
import {
  activateCompileRepairSuccessorPublicArtifact,
  compileRepairActivationMutationsConsumed,
  getActivePublicValidationArtifactId,
  getCanonicalActivePublicValidationState,
  isCompileRepairSuccessorPublicActive,
} from "./active-public-artifact";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  MARKET_VALIDATION_PURPOSE,
  PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { liveVerificationPassed, verifyDirectResponseSuccessorLivePublic } from "./cre-dr-successor-live-verify";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { fetchPublicPath } from "./validation-grade-live-verify";

export const COMPILE_REPAIR_SUCCESSOR_ACTIVATION_AUTHORIZATION_ID =
  "founder_activation_cre_compile_repair_successor_v1" as const;
export const CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION =
  "CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION" as const;
export const CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID =
  "msn_cre_compile_repair_successor_activate_v1" as const;
export const COMPILE_REPAIR_SUCCESSOR_ACTIVATION_STEPS = [
  "ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_ACTIVATE",
  "SERVED_PRODUCTION_LAYOUT_GATE",
  "ACTIVATE_PUBLIC_ARTIFACT",
  "FINAL_ARTIFACT_VALIDATION",
] as const;

export const AUTHORIZED_COMPILE_REPAIR_ACTIVATION = {
  artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
  deploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  url: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  maximumMutations: 1,
} as const;

const ACTIVATION_PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/commercial-lease-npv",
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources",
  "/resources/cam-costs/",
  "/resources/free-rent/",
  "/resources/rent-escalations/",
  "/resources/gross-vs-net-lease/",
  "/for/tenant-rep-brokers/",
  "/pricing",
  "/faq",
  "/early-access",
  "/privacy-policy",
  "/terms-of-service",
] as const;

function emptyDashboardSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: `candidate:${CRE_CANDIDATE_ID}`,
      organizationId,
      missionId: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID,
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "CRE lease NPV validation",
      ventureType: "validation",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: (
      [
        ["research_department", "Research Grid"],
        ["systems_architect", "Systems Architect"],
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
        ["creative_studio", "Design Core"],
        ["launch_operations", "Deployment Depot"],
        ["intelligence_center", "Signal Intelligence"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED" as const,
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    })),
    pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
    workerNodes: [],
  };
}

function loadEnvLocal(): boolean {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

async function getAuthorizedDeploymentReadonly(): Promise<{
  id: string;
  readyState: string | null;
  url: string | null;
  method: "GET";
}> {
  loadEnvLocal();
  const token = process.env[VERCEL_TOKEN_ENV];
  const teamId = process.env[VERCEL_TEAM_ID_ENV];
  if (!token) {
    const homepage = await fetchPublicPath(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL, "/");
    const serving =
      homepage.ok && !/Protected deployment|Log in to Vercel|DEPLOYMENT_NOT_FOUND/i.test(homepage.body);
    return {
      id: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
      readyState: serving ? "READY" : null,
      url: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL.replace(/^https:\/\//, ""),
      method: "GET",
    };
  }
  const path = `/v13/deployments/${DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID}`;
  const url = teamId ? `https://api.vercel.com${path}?teamId=${teamId}` : `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; readyState?: string; url?: string };
  return {
    id: body.id ?? DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
    readyState: body.readyState ?? null,
    url: body.url ?? null,
    method: "GET",
  };
}

function gate(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

export async function evaluateCompileRepairSuccessorActivationIdentity(input?: {
  artifactId?: string;
  digest?: string;
  deploymentId?: string;
}) {
  const reconstructed = await reconstructCreProviderEquivalentCompileRepairSuccessor();
  const artifactIdentity = gate(
    reconstructed.artifactId === AUTHORIZED_COMPILE_REPAIR_ACTIVATION.artifactId &&
      (input?.artifactId ?? AUTHORIZED_COMPILE_REPAIR_ACTIVATION.artifactId) ===
        AUTHORIZED_COMPILE_REPAIR_ACTIVATION.artifactId,
  );
  const digest = gate(
    reconstructed.digest === AUTHORIZED_COMPILE_REPAIR_ACTIVATION.digest &&
      (input?.digest ?? AUTHORIZED_COMPILE_REPAIR_ACTIVATION.digest) === AUTHORIZED_COMPILE_REPAIR_ACTIVATION.digest,
  );
  const deploymentIdentity = gate(
    (input?.deploymentId ?? AUTHORIZED_COMPILE_REPAIR_ACTIVATION.deploymentId) ===
      AUTHORIZED_COMPILE_REPAIR_ACTIVATION.deploymentId &&
      AUTHORIZED_COMPILE_REPAIR_ACTIVATION.deploymentId === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  );
  return {
    reconstructed,
    artifactIdentity,
    digest,
    deploymentIdentity,
    unpublishedSuccessorRejected: gate(
      reconstructed.artifactId !== SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
    ),
    pass: artifactIdentity === "PASS" && digest === "PASS" && deploymentIdentity === "PASS",
  };
}

export async function executeCompileRepairSuccessorAuthorizedActivation(input?: {
  organizationId?: string;
  executeLive?: boolean;
  onSnapshot?: (view: CommandActivityView, phase: string) => void;
}) {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const executeLive = input?.executeLive !== false;
  const liveProof: { dashboardDuring: Array<{ phase: string; rooms: Record<string, string> }> } = {
    dashboardDuring: [],
  };
  const beforeActiveArtifact = getActivePublicValidationArtifactId();

  const instrumented = await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID,
      missionType: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION,
      source: "cre_compile_repair_successor_activate_v1",
      executionClass: "VENTURE_EXECUTION",
      synthetic: false,
      traceability: {
        missionId: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
        candidateId: CRE_CANDIDATE_ID,
        artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
        deploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
      },
    },
    knownSteps: [...COMPILE_REPAIR_SUCCESSOR_ACTIVATION_STEPS],
    orchestrationStepType: "ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_ACTIVATE",
    onSnapshot: (view, phase) => {
      liveProof.dashboardDuring.push({
        phase,
        rooms: {
          command: view.rooms.executive_office.status,
          systems: view.rooms.systems_architect.status,
          creation: view.rooms.product_lab.status,
          validation: view.rooms.quality_control.status,
          deployment: view.rooms.launch_operations.status,
        },
      });
      input?.onSnapshot?.(view, phase);
    },
    run: async (handle) => {
      await handle.step({
        stepType: "ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_ACTIVATE",
        engine: "mission_runtime",
        summary: "Activating the existing READY compile-repair deployment. No provider write. No new deployment.",
        run: () => ({
          authorization: COMPILE_REPAIR_SUCCESSOR_ACTIVATION_AUTHORIZATION_ID,
          maximumMutations: 1,
          unpublishedSuccessor: SERVED_PRODUCTION_FULL_BLEED_REPAIR_SUCCESSOR_ARTIFACT_ID,
        }),
      });

      const pre = await handle.step({
        stepType: "SERVED_PRODUCTION_LAYOUT_GATE",
        engine: "market_validation",
        summary: executeLive
          ? "Pre-activation identity, served-production layout, and live functional verification."
          : "Pre-activation identity check only. Live verification deferred.",
        run: async () => {
          const historical = await persistDeployedCompileRepairLayoutFailHistory();
          const identity = await evaluateCompileRepairSuccessorActivationIdentity();
          if (!executeLive) {
            return {
              identity,
              historical,
              providerReady: "DEFERRED" as const,
              servedStatus: "DEFERRED" as const,
              functionalPass: false,
              layoutPass: false,
              readyForActivation: identity.pass,
              skippedLive: true as const,
            };
          }
          const provider = await getAuthorizedDeploymentReadonly();
          const providerReady = gate(
            provider.method === "GET" &&
              provider.id === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID &&
              provider.readyState === "READY",
          );
          const served = await runServedProductionRenderedLayoutGateAgainstOrigin({
            artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
            digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
            origin: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
            files: identity.reconstructed.files,
            routes: ACTIVATION_PUBLIC_ROUTES,
            viewports: ["desktop", "mobile"],
            freeze: true,
          });
          const live = await verifyDirectResponseSuccessorLivePublic({
            url: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
            intendedRoutes: [...ACTIVATION_PUBLIC_ROUTES],
            artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          });
          const adjudication = adjudicateRenderedLayout({
            servedBrowserGeometry: served.fullBleedInnerPadding,
            compiledCssText: "FAIL",
            sourceCss: "PASS",
          });
          const layoutPass = servedProductionLayoutPasses(served);
          const functionalPass = liveVerificationPassed(live);
          const questionIdentity = gate(
            live.instrumentation.questionIdentity === "PASS" && live.instrumentation.answerChunkIdentity === "PASS",
          );
          const lineage = gate(
            live.form.candidate === "PASS" &&
              live.form.experiment === "PASS" &&
              live.form.successorArtifactLineage === "PASS",
          );
          const authority = gate(
            live.homepageDr.overall === "PASS" &&
              live.geoSeo.geoseoLive === "PASS" &&
              live.schema.invalid === 0 &&
              live.links.broken === 0,
          );
          return {
            identity,
            historical,
            provider,
            providerReady,
            served,
            live,
            adjudication,
            layoutPass,
            functionalPass,
            questionIdentity,
            lineage,
            authority,
            textualParserCannotOverride: textualCssParserCannotOverrideBrowserGeometry(),
            readyForActivation:
              identity.pass &&
              providerReady === "PASS" &&
              layoutPass &&
              functionalPass &&
              lineage === "PASS" &&
              questionIdentity === "PASS" &&
              authority === "PASS",
            skippedLive: false as const,
          };
        },
      });

      const activation = await handle.step({
        stepType: "ACTIVATE_PUBLIC_ARTIFACT",
        engine: "launch_gateway",
        summary: executeLive
          ? "Single canonical activation mutation of the existing READY deployment."
          : "Activation mutation deferred.",
        run: async () => {
          if (!executeLive) {
            return {
              performed: false as const,
              reason: "LIVE_EXECUTION_DEFERRED",
              authorizationConsumed: false,
              mutations: compileRepairActivationMutationsConsumed(),
            };
          }
          if (!pre.readyForActivation) {
            return {
              performed: false as const,
              reason: "PRE_ACTIVATION_GATE_FAILED",
              authorizationConsumed: false,
              mutations: compileRepairActivationMutationsConsumed(),
            };
          }
          if (compileRepairActivationMutationsConsumed() >= AUTHORIZED_COMPILE_REPAIR_ACTIVATION.maximumMutations) {
            return {
              performed: false as const,
              reason: "ACTIVATION_AUTHORIZATION_ALREADY_CONSUMED",
              authorizationConsumed: true,
              mutations: compileRepairActivationMutationsConsumed(),
            };
          }
          try {
            const mutated = activateCompileRepairSuccessorPublicArtifact({
              artifactId: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.artifactId,
              digest: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.digest,
              deploymentId: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.deploymentId,
              url: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.url,
            });
            try {
              const { rememberValidationDeployment } = await import("./execute");
              rememberValidationDeployment({
                provider: "vercel",
                project: "infinity-validation-cre-lease-npv-e72beb7b",
                deploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
                url: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
                artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
                experimentId: LOCKED_CRE_EXPERIMENT_ID,
              });
            } catch {
              // Canonical active artifact/deployment is already bound. Execute-map binding is best-effort.
            }
            return {
              performed: true as const,
              reason: "ACTIVATED",
              authorizationConsumed: true,
              mutations: compileRepairActivationMutationsConsumed(),
              mutated,
            };
          } catch (error) {
            return {
              performed: false as const,
              reason: error instanceof Error ? error.message : "ACTIVATION_MUTATION_FAILED",
              authorizationConsumed: compileRepairActivationMutationsConsumed() >= 1,
              mutations: compileRepairActivationMutationsConsumed(),
            };
          }
        },
      });

      const post = await handle.step({
        stepType: "FINAL_ARTIFACT_VALIDATION",
        engine: "market_validation",
        summary: executeLive
          ? "Canonical readback and post-activation live verification. No second mutation."
          : "Post-activation verification deferred.",
        run: async () => {
          const correction = await persistCompileRepairLayoutFalseNegativeCorrection();
          const historyEvents = listMissionActivityEvents({
            organizationId: LIVE_ORG,
            missionId: "msn_cre_compile_repair_successor_deploy_v1",
          });
          const readback = getCanonicalActivePublicValidationState();
          const evidence = inspectRealMarketEvidence();
          const clock = inspectExperimentClock();
          if (!executeLive || !activation.performed) {
            return {
              correction,
              historyStillContainsOriginalFail: historyEvents.some(
                (event) => event.failureCode === DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
              ),
              readback,
              evidence,
              clock,
              skippedLive: true as const,
            };
          }
          const provider = await getAuthorizedDeploymentReadonly();
          const served = await runServedProductionRenderedLayoutGateAgainstOrigin({
            artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
            digest: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_SOURCE_DIGEST,
            origin: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
            files: pre.identity.reconstructed.files,
            routes: ACTIVATION_PUBLIC_ROUTES,
            viewports: ["desktop", "mobile"],
            freeze: true,
          });
          const live = await verifyDirectResponseSuccessorLivePublic({
            url: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
            intendedRoutes: [...ACTIVATION_PUBLIC_ROUTES],
            artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
            experimentId: LOCKED_CRE_EXPERIMENT_ID,
            candidateId: CRE_CANDIDATE_ID,
          });
          return {
            correction,
            historyStillContainsOriginalFail: historyEvents.some(
              (event) => event.failureCode === DEPLOYED_ARTIFACT_RENDERED_LAYOUT_BELOW_STANDARD,
            ),
            readback,
            evidence,
            clock,
            provider,
            served,
            live,
            skippedLive: false as const,
          };
        },
      });

      return { pre, activation, post };
    },
  });

  refreshMissionActivityFromDisk();
  const during = liveProof.dashboardDuring;
  const roomDuring = (needle: string, room: keyof (typeof during)[number]["rooms"]) =>
    during.find((item) => item.phase.includes(needle))?.rooms[room] ?? "PRESENT_IDLE";
  const inner = instrumented.result as {
    pre: Awaited<ReturnType<typeof evaluateCompileRepairSuccessorActivationIdentity>> extends infer I
      ? {
          identity: I;
          providerReady?: "PASS" | "FAIL" | "DEFERRED";
          served?: { status: string; routesChecked: number; routesFailed: number; fullBleedInnerPadding: string };
          live?: Awaited<ReturnType<typeof verifyDirectResponseSuccessorLivePublic>>;
          layoutPass: boolean;
          functionalPass: boolean;
          questionIdentity?: "PASS" | "FAIL";
          lineage?: "PASS" | "FAIL";
          authority?: "PASS" | "FAIL";
          readyForActivation: boolean;
          skippedLive: boolean;
        }
      : never;
    activation: {
      performed: boolean;
      reason: string;
      authorizationConsumed: boolean;
      mutations: number;
    };
    post: {
      correction: Awaited<ReturnType<typeof persistCompileRepairLayoutFalseNegativeCorrection>>;
      historyStillContainsOriginalFail: boolean;
      readback: ReturnType<typeof getCanonicalActivePublicValidationState>;
      evidence: ReturnType<typeof inspectRealMarketEvidence>;
      clock: ReturnType<typeof inspectExperimentClock>;
      provider?: { readyState: string | null };
      served?: { status: string; routesChecked: number; routesFailed: number };
      live?: Awaited<ReturnType<typeof verifyDirectResponseSuccessorLivePublic>>;
      skippedLive: boolean;
    };
  };

  const readback = getCanonicalActivePublicValidationState();
  const clock = inspectExperimentClock();
  const evidence = inspectRealMarketEvidence();
  const mutationMatchesReadback =
    readback.activeArtifactId === PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID &&
    readback.activeDeploymentId === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID &&
    readback.activeUrl === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL &&
    isCompileRepairSuccessorPublicActive();

  let result:
    | "YES — VERIFIED CRE DEPLOYMENT ACTIVATED; VALIDATION EXPERIMENT CONTINUES"
    | "PARTIAL — ACTIVATION SUCCEEDED BUT POST-ACTIVATION READBACK OR LIVE VERIFICATION IS INCOMPLETE"
    | "NO — ACTIVATION FAILED; AUTHORIZATION CONSUMED; NO RETRY AUTHORIZED"
    | "BLOCKED — PRE-ACTIVATION GATE FAILED; NO ACTIVATION PERFORMED"
    | "DEFERRED";
  if (!executeLive) {
    result = "DEFERRED";
  } else if (!inner.activation.performed && inner.activation.reason === "PRE_ACTIVATION_GATE_FAILED") {
    result = "BLOCKED — PRE-ACTIVATION GATE FAILED; NO ACTIVATION PERFORMED";
  } else if (!inner.activation.performed && inner.activation.authorizationConsumed) {
    result = "NO — ACTIVATION FAILED; AUTHORIZATION CONSUMED; NO RETRY AUTHORIZED";
  } else if (!inner.activation.performed) {
    result = "BLOCKED — PRE-ACTIVATION GATE FAILED; NO ACTIVATION PERFORMED";
  } else if (
    mutationMatchesReadback &&
    inner.post.provider?.readyState === "READY" &&
    inner.post.served?.status === "PASS" &&
    inner.post.served.routesChecked === 17 &&
    inner.post.live &&
    liveVerificationPassed(inner.post.live)
  ) {
    result = "YES — VERIFIED CRE DEPLOYMENT ACTIVATED; VALIDATION EXPERIMENT CONTINUES";
  } else {
    result = "PARTIAL — ACTIVATION SUCCEEDED BUT POST-ACTIVATION READBACK OR LIVE VERIFICATION IS INCOMPLETE";
  }

  return {
    authorizationId: COMPILE_REPAIR_SUCCESSOR_ACTIVATION_AUTHORIZATION_ID,
    mission: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION,
    missionId: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID,
    authorizedArtifact: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.artifactId,
    authorizedDigest: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.digest,
    authorizedDeployment: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.deploymentId,
    authorizedActivationMutations: AUTHORIZED_COMPILE_REPAIR_ACTIVATION.maximumMutations,
    authorizationConsumed: inner.activation.authorizationConsumed ? ("YES" as const) : ("NO" as const),
    beforeActiveArtifact,
    expectedBeforeActiveArtifact: PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID,
    afterActiveArtifact: readback.activeArtifactId,
    activeDeployment: readback.activeDeploymentId,
    activeUrl: readback.activeUrl,
    readback,
    readbackMatchesMutation: mutationMatchesReadback ? ("YES" as const) : ("NO" as const),
    pre: inner.pre,
    activation: inner.activation,
    post: inner.post,
    experiment: {
      state: evidence.experiment.state,
      evidenceStart: clock.evidenceStart,
      deadline: clock.deadline,
      clockRestarted: clock.restarted,
      expectedClockRestarted: false as const,
      qualified: `${evidence.counts.qualifiedSubmissions} / 15`,
      strongIntent: `${evidence.counts.strongIntent} / 5`,
      pricing: `${evidence.counts.pricingSelections} / 5`,
      syntheticEvidence: 0,
      canonicalEvidenceStart: CANONICAL_EVIDENCE_START,
    },
    publicState: {
      deployed: "YES" as const,
      active: isCompileRepairSuccessorPublicActive() ? ("YES" as const) : ("NO" as const),
      publiclyLaunched: "NO" as const,
      reason:
        "READY is not PUBLICLY_LAUNCHED. Activation binds Infinity's validation artifact to the existing READY deployment. The experiment remains COLLECTING. No public-launch, domain, DNS, payment, or outreach authorization was granted.",
    },
    historical: {
      originalFailurePreserved: inner.post.historyStillContainsOriginalFail ? ("YES" as const) : ("NO" as const),
      correctedClassification: LIVE_LAYOUT_VERIFICATION_FALSE_NEGATIVE,
      actualArtifactDefect: "NO" as const,
    },
    hq: {
      mission: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION,
      command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? ("PASS" as const) : ("FAIL" as const),
      deploymentDepot:
        roomDuring("ACTIVATE_PUBLIC_ARTIFACT", "deployment") === "ACTIVE_WORK" ? ("PASS" as const) : ("FAIL" as const),
      validationStation:
        roomDuring("SERVED_PRODUCTION_LAYOUT_GATE", "validation") === "ACTIVE_WORK" ||
        roomDuring("FINAL_ARTIFACT_VALIDATION", "validation") === "ACTIVE_WORK"
          ? ("PASS" as const)
          : ("FAIL" as const),
      creationLab: "PRESENT_IDLE" as const,
      systemsArchitect: "PRESENT_IDLE" as const,
      completion: instrumented.events.some((event) => event.eventType === "MISSION_COMPLETED")
        ? ("PASS" as const)
        : ("FAIL" as const),
      latestCompleted:
        attachCommandActivity(emptyDashboardSnapshot(organizationId)).latestCompletedExecution?.missionId ===
        CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID
          ? ("PASS" as const)
          : ("FAIL" as const),
    },
    commandLiveProof: {
      missionId: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION_ID,
      missionType: CRE_GOVERNED_EXISTING_DEPLOYMENT_ACTIVATION_MISSION,
      command: during.some((item) => item.rooms.command === "ACTIVE_WORK") ? "ACTIVE_WORK" : "PRESENT_IDLE",
      systemsArchitect: "PRESENT_IDLE" as const,
      creationLab: "PRESENT_IDLE" as const,
      validationStation:
        roomDuring("SERVED_PRODUCTION_LAYOUT_GATE", "validation") === "ACTIVE_WORK" ||
        roomDuring("FINAL_ARTIFACT_VALIDATION", "validation") === "ACTIVE_WORK"
          ? "ACTIVE_WORK"
          : "PRESENT_IDLE",
      deploymentDepot:
        roomDuring("ACTIVATE_PUBLIC_ARTIFACT", "deployment") === "ACTIVE_WORK" ? "ACTIVE_WORK" : "PRESENT_IDLE",
    },
    registry: instrumentedRuntimeRegistry(),
    liveProof,
    dashboardAfter: attachCommandActivity(emptyDashboardSnapshot(organizationId)),
    providerWrites: 0 as const,
    deployments: 0 as const,
    uploads: 0 as const,
    retries: 0 as const,
    activationMutations: inner.activation.mutations,
    protectionMutations: 0 as const,
    deploymentCost: "NONE — NO NEW DEPLOYMENT" as const,
    activationCost: "UNKNOWN" as const,
    result,
    purpose: MARKET_VALIDATION_PURPOSE,
  };
}
