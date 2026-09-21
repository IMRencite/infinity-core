import { evaluateBrowserConsoleQCGate } from "./console-gate";
import { evaluateCustomerFacingInteractionQCGate } from "./interaction-gate";
import { evaluateCustomerFacingNavigationQCGate } from "./navigation-gate";
import { evaluateCustomerFacingNetworkQCGate } from "./network-gate";
import { evaluateCustomerFacingProductionQualityGate } from "./production-quality-gate";
import { evaluateRenderedImprovementIntakeVerificationGate } from "./rendered-intake-gate";
import type { NamedGate, ProductionQualityEvidence, RenderedIntakeEvidence } from "./contract";

function pass(gate: string): NamedGate {
  return { gate, result: "PASS", reasons: [] };
}

function fail(gate: string, reason: string): NamedGate {
  return { gate, result: "FAIL", reasons: [reason] };
}

const healthySupporting = {
  interaction: pass("CustomerFacingInteractionQCGate"),
  console: pass("BrowserConsoleQCGate"),
  network: pass("CustomerFacingNetworkQCGate"),
  navigation: pass("CustomerFacingNavigationQCGate"),
  responsive: pass("ResponsiveQCGate"),
  accessibility: pass("AccessibilityQCGate"),
  workflow: pass("ProductWorkflowQCGate"),
  production_readiness: pass("ProductionReadinessQCGate"),
} satisfies Omit<ProductionQualityEvidence, "venture_id" | "evidence_level" | "rendered" | "typecheck" | "production_build">;

export function fixtureBuildPassButtonMissing(): NamedGate {
  return evaluateCustomerFacingProductionQualityGate({
    venture_id: "fixture:build-pass-button-missing",
    evidence_level: "SERVED_LOCAL",
    typecheck: "PASS",
    production_build: "PASS",
    rendered: fail("RenderedImprovementIntakeVerificationGate", "TRIGGER_NOT_RENDERED"),
    ...healthySupporting,
  });
}

export function fixtureComponentExistsNotRendered(): NamedGate {
  return evaluateRenderedImprovementIntakeVerificationGate({
    venture_id: "fixture:component-exists",
    evidence_level: "SOURCE_ONLY",
    source_only: true,
    trigger_rendered: false,
    trigger_reachable: false,
    trigger_clickable: false,
    form_opens: false,
    form_fields_render: false,
    submission_works: false,
    success_state_works: false,
    failure_state_works: false,
    canonical_ingest_works: false,
  });
}

export function fixtureApiExistsNoTrigger(): NamedGate {
  return evaluateRenderedImprovementIntakeVerificationGate({
    venture_id: "fixture:api-exists",
    evidence_level: "SERVED_LOCAL",
    trigger_rendered: false,
    trigger_reachable: false,
    trigger_clickable: false,
    form_opens: false,
    form_fields_render: false,
    submission_works: true,
    success_state_works: true,
    failure_state_works: true,
    canonical_ingest_works: true,
  });
}

export function fixtureVisibleButtonBrokenFetch(): {
  interaction: NamedGate;
  console: NamedGate;
  network: NamedGate;
} {
  return {
    interaction: evaluateCustomerFacingInteractionQCGate([
      {
        name: "Suggest an Improvement",
        rendered: true,
        visible: true,
        enabled: true,
        clickable: true,
        action_ok: false,
        uncaught_exception: true,
        result_state_ok: false,
      },
    ]),
    console: evaluateBrowserConsoleQCGate(["Uncaught TypeError: Failed to fetch"]),
    network: evaluateCustomerFacingNetworkQCGate([
      {
        name: "improvement-intake",
        required: true,
        method: "POST",
        ok: false,
        status: null,
        failure: "Failed to fetch",
      },
    ]),
  };
}

export function fixtureCompleteRenderedFlow(): NamedGate {
  const evidence: RenderedIntakeEvidence = {
    venture_id: "fixture:complete",
    evidence_level: "SERVED_LOCAL",
    founder_physical: "PASS",
    trigger_rendered: true,
    trigger_reachable: true,
    trigger_clickable: true,
    form_opens: true,
    form_fields_render: true,
    submission_works: true,
    success_state_works: true,
    failure_state_works: true,
    canonical_ingest_works: true,
  };
  const rendered = evaluateRenderedImprovementIntakeVerificationGate(evidence);
  return evaluateCustomerFacingProductionQualityGate({
    venture_id: evidence.venture_id,
    evidence_level: "SERVED_LOCAL",
    typecheck: "PASS",
    production_build: "PASS",
    rendered,
    ...healthySupporting,
    interaction: evaluateCustomerFacingInteractionQCGate([
      {
        name: "Suggest an Improvement",
        rendered: true,
        visible: true,
        enabled: true,
        clickable: true,
        action_ok: true,
        uncaught_exception: false,
        result_state_ok: true,
      },
    ]),
    navigation: evaluateCustomerFacingNavigationQCGate([
      { route: "/", reached: true, failed_fetch: false },
      { route: "/suggest-improvement", reached: true, failed_fetch: false },
    ]),
  });
}

export function fixtureFailedFetchRegression(consoleText: string): NamedGate {
  return evaluateBrowserConsoleQCGate([consoleText]);
}
