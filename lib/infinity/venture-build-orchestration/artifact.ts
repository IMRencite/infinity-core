import { randomUUID } from "node:crypto";
import { routeCodingTask } from "@/lib/infinity/product-asset-builder/v2.1/routing/coding-router";
import { WorkspaceMutationEngine } from "@/lib/infinity/product-asset-builder/v2.1/mutation/workspace-mutation-engine";
import { VentureSandbox } from "@/lib/infinity/product-asset-builder/workspace/sandbox";
import type { CodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/types";
import {
  CRE_CANDIDATE_ID,
  FAILED_CRE_VALIDATION_DEPLOYMENT_ID,
  FAILED_CRE_VALIDATION_PROJECT,
  SUCCESSOR_CRE_ARTIFACT_ID,
  VALIDATION_GRADE_REPAIR_REASON,
  marketValidationExperimentId,
} from "@/lib/infinity/market-validation-experiment/constants";
import { PUBLIC_INGEST_ROUTE_FILE } from "@/lib/infinity/market-validation-experiment/ingest";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/source-bundle-request";
import {
  fullProductLegalFacts,
  privacyPolicySource,
  sitemapSource,
  termsOfServiceSource,
  validationGradeGlobalCss,
  validationGradePrimitivesSource,
  validationLandingLegalFacts,
} from "@/lib/infinity/public-venture-template";
import { footerComponentSource } from "./footer";
import {
  generatedVentureImprovementIntakeComponentSource,
  generatedVentureImprovementIntakeRouteSource,
} from "@/lib/infinity/venture-improvement-intake/factory";
import { synchronizeGeneratedNpmLockfile } from "./generated-lockfile";
import {
  GENERATED_NEXTJS_ARTIFACT_CONTRACT,
  artifactIdFor,
  buildGeneratedNextJsPackageJson,
  generatedNextEnvDts,
  generatedTsconfigJson,
} from "./generated-nextjs-package";
import type {
  ArtifactLineage,
  ExecutableVenturePlan,
  GeneratedArtifactFile,
  VentureBuildArtifact,
  VentureBuildPackage,
} from "./types";

export { artifactIdFor, GENERATED_NEXTJS_ARTIFACT_CONTRACT } from "./generated-nextjs-package";

function creSuccessorLineage(plan: ExecutableVenturePlan): ArtifactLineage | undefined {
  if (plan.kind !== "VALIDATION_ARTIFACT_WORK" || plan.candidateId !== CRE_CANDIDATE_ID) return undefined;
  return {
    predecessorArtifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    predecessorDigest: SUCCESSOR_CRE_SOURCE_DIGEST,
    repairReason: VALIDATION_GRADE_REPAIR_REASON,
    failedDeploymentId: FAILED_CRE_VALIDATION_DEPLOYMENT_ID,
    failedProject: FAILED_CRE_VALIDATION_PROJECT,
    generationContract: GENERATED_NEXTJS_ARTIFACT_CONTRACT,
  };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "venture-product";
}

function landingDomainModule(plan: ExecutableVenturePlan): string {
  const roles = JSON.stringify(["CRE broker", "Tenant representative", "Boutique brokerage"]);
  return `export const QUALIFIED_ROLES = ${roles} as const;

export type PilotRole = (typeof QUALIFIED_ROLES)[number] | "Other";

export function qualifyProspect(input: {
  role: string;
  dealFrequency: string;
  leaseWorkflow: boolean;
}): { qualified: boolean; reason: string } {
  const roleOk = QUALIFIED_ROLES.some((item) => item.toLowerCase() === input.role.toLowerCase());
  const activityOk = /weekly|monthly|quarterly|active|current/i.test(input.dealFrequency);
  if (!roleOk) return { qualified: false, reason: "Role is outside the CRE broker / tenant-rep audience." };
  if (!input.leaseWorkflow) return { qualified: false, reason: "No commercial lease workflow." };
  if (!activityOk) return { qualified: false, reason: "No recent or current deal activity." };
  return { qualified: true, reason: "Qualified CRE prospect." };
}

export const mvpFeatures = [${plan.productRequirements.mvpScope.map((item) => JSON.stringify(item)).join(", ")}] as const;
export const leaveOuts = [${plan.productRequirements.doNotCopy.map((item) => JSON.stringify(item)).join(", ")}] as const;
`;
}

function formModule(): string {
  return `export const PILOT_FORM_FIELDS = [
  "name",
  "workEmail",
  "role",
  "company",
  "teamSize",
  "dealFrequency",
  "preferredPricing",
  "pilotInterest",
] as const;

export const SENSITIVE_FIELDS_FORBIDDEN = [
  "ssn",
  "bank",
  "lease_document",
  "password",
  "card_number",
] as const;

export type PilotFormInput = {
  name: string;
  workEmail: string;
  role: string;
  company: string;
  teamSize: string;
  dealFrequency: string;
  preferredPricing: string;
  pilotInterest: boolean;
};

export function validatePilotForm(input: PilotFormInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("name");
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.workEmail)) errors.push("workEmail");
  if (!input.role.trim()) errors.push("role");
  if (!input.company.trim()) errors.push("company");
  if (!input.teamSize.trim()) errors.push("teamSize");
  if (!input.dealFrequency.trim()) errors.push("dealFrequency");
  if (!input.preferredPricing.trim()) errors.push("preferredPricing");
  if (!input.pilotInterest) errors.push("pilotInterest");
  return { ok: errors.length === 0, errors };
}

export function submissionDedupeKey(email: string): string {
  return email.trim().toLowerCase();
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}
`;
}

function eventsModule(plan: ExecutableVenturePlan): string {
  return `export const EXPERIMENT_EVENT_TYPES = [
  "experiment_view",
  "pricing_view",
  "pricing_option_selected",
  "primary_cta_click",
  "pilot_form_start",
  "pilot_form_submit",
  "qualified_interest",
  "strong_purchase_intent",
] as const;

export type ExperimentEventType = (typeof EXPERIMENT_EVENT_TYPES)[number];

export type ExperimentEvent = {
  type: ExperimentEventType;
  candidateId: ${JSON.stringify(plan.candidateId)};
  experimentId: string;
  artifactId: string;
  variant: "single_offer";
  occurredAt: string;
  synthetic: boolean;
};

export function eventWeight(type: ExperimentEventType): "WEAK" | "MODERATE" | "STRONG" {
  if (type === "experiment_view" || type === "pricing_view") return "WEAK";
  if (type === "primary_cta_click" || type === "pilot_form_start" || type === "pricing_option_selected") return "MODERATE";
  return "STRONG";
}
`;
}

function landingCta(plan: ExecutableVenturePlan): string {
  return plan.candidateId === CRE_CANDIDATE_ID ? "Request Pilot Access" : "Request Early Access";
}

function landingTone(plan: ExecutableVenturePlan): string {
  return plan.candidateId === CRE_CANDIDATE_ID ? "cre" : "default";
}

function featureCards(plan: ExecutableVenturePlan): string {
  return plan.productRequirements.mvpScope
    .map((item) => `          <FeatureCard title=${JSON.stringify(item)}>${escapeJsx(item)}</FeatureCard>`)
    .join("\n");
}

function leaveCards(plan: ExecutableVenturePlan): string {
  return plan.productRequirements.doNotCopy
    .map((item) => `          <FeatureCard title=${JSON.stringify(item)}>Out of scope for this focused workflow.</FeatureCard>`)
    .join("\n");
}

function pricingCards(plan: ExecutableVenturePlan): string {
  return plan.monetizationRequirements.tiers
    .map((item) => {
      const [title, price] = item.split(" — ");
      return `          <PricingCard title=${JSON.stringify(title ?? item)} price=${JSON.stringify(price ?? "")} />`;
    })
    .join("\n");
}

function landingPageSource(plan: ExecutableVenturePlan): string {
  const cta = landingCta(plan);
  return `import { VentureFooter } from "../components/venture-footer";
import { CardGrid, Disclosure, FeatureCard, Hero, PageShell, PricingCard, PrimaryCTA, Section } from "../components/validation-grade";
import { ViewBeacon } from "./view-beacon";

export default function Page() {
  return (
    <PageShell tone=${JSON.stringify(landingTone(plan))}>
      <ViewBeacon />
      <Hero
        title="${escapeJsx(plan.ventureRequirements.name)}"
        audience={"For ${escapeJsx(plan.ventureRequirements.customer)}"}
        problem={"${escapeJsx(plan.ventureRequirements.problem)}"}
        value={"Proposed early-access workflow: ${escapeJsx(plan.ventureRequirements.promise)}"}
        cta={<PrimaryCTA href="/early-access">${cta}</PrimaryCTA>}
      />
      <Section title="Proposed product scope" kicker="What this would do">
        <CardGrid>
${featureCards(plan)}
        </CardGrid>
      </Section>
      <Section title="Focused by design" kicker="What this is not">
        <CardGrid>
${leaveCards(plan)}
        </CardGrid>
      </Section>
      <Section title="Pricing hypotheses" kicker="Interest only — not a purchase">
        <CardGrid>
${pricingCards(plan)}
        </CardGrid>
        <Disclosure>
          Pricing is being tested. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.
        </Disclosure>
        <p><PrimaryCTA href="/early-access">${cta}</PrimaryCTA></p>
      </Section>
      <Section title="Important context">
        <Disclosure>
          Calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. No attorney review is claimed.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
`;
}

function ingestClientSource(input: {
  candidateId: string;
  experimentId: string;
  artifactId: string;
}): string {
  return `export const VALIDATION_CANDIDATE_ID = ${JSON.stringify(input.candidateId)};
export const VALIDATION_EXPERIMENT_ID = ${JSON.stringify(input.experimentId)};
export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(input.artifactId)};
export const VALIDATION_INGEST_PATH = "/api/public/market-validation/" + VALIDATION_EXPERIMENT_ID + "/ingest";

export async function postValidationIngest(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
  const response = await fetch(VALIDATION_INGEST_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: response.ok };
}

export function captureLandingAttribution(): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landingTimestamp: string;
} {
  if (typeof window === "undefined") {
    return { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, landingTimestamp: new Date().toISOString() };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    referrer: document.referrer || null,
    landingTimestamp: new Date().toISOString(),
  };
}

export async function emitExperimentEvent(type: string): Promise<void> {
  await postValidationIngest({ kind: "event", type, ...captureLandingAttribution() });
}

export async function submitPilotForm(form: Record<string, unknown>): Promise<{ ok: boolean }> {
  return postValidationIngest({ kind: "form", form });
}
`;
}

function ingestRouteSource(experimentId: string): string {
  return `const ALLOWED_EXPERIMENT_ID = ${JSON.stringify(experimentId)};
const MAX_BYTES = 8192;
const RATE_LIMIT = 30;
const WINDOW_MS = 60000;
const EVENT_TYPES = [
  "PAGE_VIEW",
  "PRICING_VIEW",
  "CTA_CLICK",
  "FORM_START",
  "EARLY_ACCESS_REQUEST",
  "PILOT_REQUEST",
  "PRICE_OPTION_SELECTED",
  "QUALIFIED_PILOT_APPLICATION",
  "STRONG_PURCHASE_INTENT",
] as const;
const FORM_KEYS = [
  "name",
  "workEmail",
  "role",
  "company",
  "teamSize",
  "dealFrequency",
  "preferredPricing",
  "leaseWorkflow",
  "pilotInterest",
] as const;

let windowStart = 0;
let acceptedInWindow = 0;
const received: Array<{ at: number; synthetic: boolean; kind: string }> = [];

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

type ParsedBody =
  | { ok: false; error: string }
  | { ok: true; request: { kind: "form" | "event"; synthetic: boolean } };

function parseBody(body: unknown): ParsedBody {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_payload" };
  const record = body as Record<string, unknown>;
  const kind = record.kind === "form" ? "form" : record.kind === "event" || record.type ? "event" : null;
  if (!kind) return { ok: false, error: "invalid_payload" };
  if (kind === "form") {
    const form = record.form && typeof record.form === "object" && !Array.isArray(record.form) ? (record.form as Record<string, unknown>) : record;
    const extra = Object.keys(form).filter((key) => !(FORM_KEYS as readonly string[]).includes(key) && key !== "kind" && key !== "synthetic" && key !== "sessionId" && key !== "occurredAt" && key !== "variant");
    if (extra.length) return { ok: false, error: "unexpected_form_fields" };
    return { ok: true, request: { kind: "form", synthetic: record.synthetic === true } };
  }
  const eventType = String(record.eventType || record.type || "").toUpperCase();
  if (!(EVENT_TYPES as readonly string[]).includes(eventType) || eventType === "PAID_COMMITMENT") return { ok: false, error: "unsupported_event" };
  return { ok: true, request: { kind: "event", synthetic: record.synthetic === true } };
}

export async function POST(request: Request, context: { params: Promise<{ experimentId: string }> }) {
  const { experimentId } = await context.params;
  if (experimentId !== ALLOWED_EXPERIMENT_ID) return json({ error: "unknown_experiment" }, 404);
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json({ error: "payload_too_large" }, 413);
  const now = Date.now();
  if (!windowStart || now - windowStart >= WINDOW_MS) {
    windowStart = now;
    acceptedInWindow = 0;
  }
  if (acceptedInWindow >= RATE_LIMIT) return json({ error: "rate_limited" }, 429);
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = parseBody(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  acceptedInWindow += 1;
  received.push({ at: now, synthetic: parsed.request.synthetic === true, kind: parsed.request.kind });
  return json({ accepted: 1, duplicates: 0 }, 202);
}
`;
}

function viewBeaconSource(): string {
  return `"use client";
import { useEffect } from "react";
import { emitExperimentEvent } from "./ingest-client";

export function ViewBeacon() {
  useEffect(() => {
    void emitExperimentEvent("PAGE_VIEW");
  }, []);
  return null;
}
`;
}

function earlyAccessPageSource(plan: ExecutableVenturePlan): string {
  const options = plan.monetizationRequirements.tiers
    .map((item) => `<option value=${JSON.stringify(item)}>${escapeJsx(item)}</option>`)
    .join("");
  return `"use client";
import { FormEvent, useState } from "react";
import { Disclosure, PageShell, Section, VentureFooter } from "../ui";
import { submitPilotForm } from "../ingest-client";

export default function EarlyAccessPage() {
  const [status, setStatus] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await submitPilotForm({
      name: String(data.get("name") ?? ""),
      workEmail: String(data.get("workEmail") ?? ""),
      role: String(data.get("role") ?? ""),
      company: String(data.get("company") ?? ""),
      teamSize: String(data.get("teamSize") ?? ""),
      dealFrequency: String(data.get("dealFrequency") ?? ""),
      preferredPricing: String(data.get("preferredPricing") ?? ""),
      leaseWorkflow: data.get("leaseWorkflow") === "on",
      pilotInterest: data.get("pilotInterest") === "on",
    });
    setStatus(result.ok ? "Request received. No payment was taken." : "Request could not be sent.");
  }
  return (
    <PageShell tone=${JSON.stringify(landingTone(plan))}>
      <Section title="Request Pilot Access" kicker="Pilot / early access">
        <p className="vg-lede">This product is in validation and is not generally available. No payment will be taken.</p>
        <form className="vg-form" onSubmit={onSubmit}>
          <div className="vg-form-field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="workEmail">Work email</label>
            <input id="workEmail" name="workEmail" type="email" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" required>
              <option>CRE broker</option>
              <option>Tenant representative</option>
              <option>Boutique brokerage</option>
              <option>Other</option>
            </select>
          </div>
          <div className="vg-form-field">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="teamSize">Team size</label>
            <input id="teamSize" name="teamSize" required />
          </div>
          <div className="vg-form-field">
            <label htmlFor="dealFrequency">Approximate deal frequency</label>
            <select id="dealFrequency" name="dealFrequency" required>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Rarely</option>
            </select>
          </div>
          <div className="vg-form-field">
            <label htmlFor="preferredPricing">Preferred pricing option</label>
            <select id="preferredPricing" name="preferredPricing" required>
              ${options}
            </select>
          </div>
          <label>
            <input type="checkbox" name="leaseWorkflow" />
            I currently compare or advise on commercial leases.
          </label>
          <label>
            <input type="checkbox" name="pilotInterest" required />
            I am interested in a paid pilot if the product is built.
          </label>
          <button type="submit">Request Pilot Access</button>
        </form>
        {status ? <p role="status">{status}</p> : null}
        <Disclosure>
          Do not send SSNs, bank details, lease files, or other sensitive documents. Pricing selection is interest, not a purchase.
        </Disclosure>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
`;
}

function landingTestSource(): string {
  return `import { qualifyProspect } from "../lib/domain";
import { validatePilotForm, submissionDedupeKey } from "../lib/form";

export function runDomainTests(): { passed: number; failed: number } {
  const qualified = qualifyProspect({
    role: "CRE broker",
    dealFrequency: "monthly",
    leaseWorkflow: true,
  });
  const unrelated = qualifyProspect({
    role: "Other",
    dealFrequency: "rarely",
    leaseWorkflow: false,
  });
  const form = validatePilotForm({
    name: "Alex Broker",
    workEmail: "alex@broker.example",
    role: "CRE broker",
    company: "Boutique CRE",
    teamSize: "4",
    dealFrequency: "Monthly",
    preferredPricing: "annual",
    pilotInterest: true,
  });
  const passed =
    qualified.qualified &&
    !unrelated.qualified &&
    form.ok &&
    submissionDedupeKey("Alex@Broker.example") === "alex@broker.example"
      ? 4
      : 0;
  return { passed, failed: 4 - passed };
}
`;
}

function escapeJsx(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function domainModule(plan: ExecutableVenturePlan): string {
  const features = plan.productRequirements.mvpScope.map((item) => JSON.stringify(item)).join(", ");
  return `export type LeaseInput = {
  name: string;
  startRent: number;
  annualIncrease: number;
  termYears: number;
  discountRate: number;
};

export function leaseCashFlows(input: LeaseInput): number[] {
  return Array.from({ length: input.termYears }, (_, year) =>
    input.startRent * Math.pow(1 + input.annualIncrease, year),
  );
}

export function netPresentValue(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + discountRate, index + 1), 0);
}

export function compareLeases(left: LeaseInput, right: LeaseInput): {
  leftNpv: number;
  rightNpv: number;
  cheaper: string;
} {
  const leftNpv = netPresentValue(leaseCashFlows(left), left.discountRate);
  const rightNpv = netPresentValue(leaseCashFlows(right), right.discountRate);
  return {
    leftNpv,
    rightNpv,
    cheaper: leftNpv <= rightNpv ? left.name : right.name,
  };
}

export const mvpFeatures = [${features}] as const;
`;
}

function pageSource(plan: ExecutableVenturePlan): string {
  return `import { VentureFooter } from "../components/venture-footer";
import { PageShell, Section } from "../components/validation-grade";
import { compareLeases } from "../lib/domain";

const defaultCompare = compareLeases(
  { name: "Lease A", startRent: 42000, annualIncrease: 0.03, termYears: 5, discountRate: 0.08 },
  { name: "Lease B", startRent: 39000, annualIncrease: 0.05, termYears: 5, discountRate: 0.08 },
);

export default function Page() {
  return (
    <PageShell>
      <header className="vg-hero">
        <div className="vg-container">
          <h1>${escapeJsx(plan.ventureRequirements.name)}</h1>
        </div>
      </header>
      <Section title="Proposed workflow">
        <p>${escapeJsx(plan.productRequirements.problem)}</p>
        <p>${escapeJsx(plan.productRequirements.corePromise)}</p>
        <h3>Lease comparison</h3>
        <p>Lower NPV: {defaultCompare.cheaper}</p>
        <ul>
          ${plan.productRequirements.mvpScope.map((item) => `<li>${escapeJsx(item)}</li>`).join("\n          ")}
        </ul>
      </Section>
      <VentureFooter />
    </PageShell>
  );
}
`;
}

function layoutSource(plan: ExecutableVenturePlan): string {
  return `import "../styles/globals.css";

export const metadata = { title: ${JSON.stringify(plan.ventureRequirements.name)} };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-venture-tone=${JSON.stringify(landingTone(plan))}>{children}</body>
    </html>
  );
}
`;
}

function testSource(): string {
  return `import { compareLeases, netPresentValue } from "../lib/domain";

export function runDomainTests(): { passed: number; failed: number } {
  const npv = netPresentValue([1000, 1000], 0);
  const compare = compareLeases(
    { name: "A", startRent: 10, annualIncrease: 0, termYears: 2, discountRate: 0 },
    { name: "B", startRent: 20, annualIncrease: 0, termYears: 2, discountRate: 0 },
  );
  const passed = npv === 2000 && compare.cheaper === "A" ? 2 : 0;
  return { passed, failed: 2 - passed };
}
`;
}

export function buildArtifactChangeSet(plan: ExecutableVenturePlan, pkg: VentureBuildPackage): CodeChangeSet {
  const name = slug(plan.ventureRequirements.name);
  const landing = plan.kind === "VALIDATION_ARTIFACT_WORK";
  const lineage = creSuccessorLineage(plan);
  const artifactId = artifactIdFor(plan, pkg);
  const plannedPaths = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next-env.d.ts",
    "app/page.tsx",
    "app/layout.tsx",
    "components/venture-footer.tsx",
    "components/venture-improvement-intake.tsx",
    "app/api/improvement-intake/route.ts",
    "lib/domain.ts",
    "styles/globals.css",
    "tests/domain.test.ts",
    "artifact-manifest.json",
    "components/validation-grade.tsx",
    "app/ui.ts",
    "app/privacy-policy/page.tsx",
    "app/terms-of-service/page.tsx",
    "app/sitemap.ts",
    ...(landing
      ? [
          "lib/form.ts",
          "lib/events.ts",
          "app/ingest-client.ts",
          "app/view-beacon.tsx",
          "app/early-access/page.tsx",
          PUBLIC_INGEST_ROUTE_FILE,
        ]
      : []),
  ];
  const files: GeneratedArtifactFile[] = [
    {
      path: "package.json",
      content: buildGeneratedNextJsPackageJson({ name, relativePaths: plannedPaths }),
    },
    { path: "tsconfig.json", content: generatedTsconfigJson() },
    { path: "next-env.d.ts", content: generatedNextEnvDts() },
    { path: "app/page.tsx", content: landing ? landingPageSource(plan) : pageSource(plan) },
    { path: "app/layout.tsx", content: layoutSource(plan) },
    { path: "components/venture-footer.tsx", content: footerComponentSource(plan.footerRequirements) },
    { path: "components/venture-improvement-intake.tsx", content: generatedVentureImprovementIntakeComponentSource() },
    { path: "app/api/improvement-intake/route.ts", content: generatedVentureImprovementIntakeRouteSource(plan.ventureId) },
    { path: "components/validation-grade.tsx", content: validationGradePrimitivesSource() },
    { path: "lib/domain.ts", content: landing ? landingDomainModule(plan) : domainModule(plan) },
    {
      path: "styles/globals.css",
      content: validationGradeGlobalCss(),
    },
    {
      path: "app/ui.ts",
      content: `export { VentureFooter } from "../components/venture-footer";
export {
  CardGrid,
  Disclosure,
  FeatureCard,
  FormContainer,
  Hero,
  PageShell,
  PricingCard,
  PrimaryCTA,
  Section,
  ValidationBadge,
} from "../components/validation-grade";
`,
    },
    {
      path: "app/privacy-policy/page.tsx",
      content: privacyPolicySource(
        landing ? validationLandingLegalFacts(plan.ventureRequirements.name) : fullProductLegalFacts(plan.ventureRequirements.name),
      ),
    },
    {
      path: "app/terms-of-service/page.tsx",
      content: termsOfServiceSource(
        landing ? validationLandingLegalFacts(plan.ventureRequirements.name) : fullProductLegalFacts(plan.ventureRequirements.name),
      ),
    },
    {
      path: "app/sitemap.ts",
      content: sitemapSource(
        landing
          ? ["/", "/early-access", "/privacy-policy", "/terms-of-service"]
          : ["/", "/privacy-policy", "/terms-of-service"],
      ),
    },
    { path: "tests/domain.test.ts", content: landing ? landingTestSource() : testSource() },
    {
      path: "artifact-manifest.json",
      content: JSON.stringify(
        {
          artifactType: "nextjs_web_product",
          role: landing ? "validation_landing" : "full_product",
          ventureId: plan.ventureId,
          planId: plan.planId,
          packageId: pkg.packageId,
          artifactId,
          generationContract: GENERATED_NEXTJS_ARTIFACT_CONTRACT,
          footerRequired: pkg.publicWebsite.footerAttribution.required,
          fullProduct: !landing,
          lineage: lineage ?? null,
        },
        null,
        2,
      ),
    },
  ];
  if (landing) {
    const experimentId = marketValidationExperimentId(plan.candidateId ?? "");
    files.push(
      { path: "lib/form.ts", content: formModule() },
      { path: "lib/events.ts", content: eventsModule(plan) },
      {
        path: "app/ingest-client.ts",
        content: ingestClientSource({
          candidateId: plan.candidateId ?? "",
          experimentId,
          artifactId,
        }),
      },
      { path: "app/view-beacon.tsx", content: viewBeaconSource() },
      { path: "app/early-access/page.tsx", content: earlyAccessPageSource(plan) },
      { path: PUBLIC_INGEST_ROUTE_FILE, content: ingestRouteSource(experimentId) },
    );
  }

  return {
    taskId: plan.tasks.find((task) => task.phase === "PRODUCT_BUILD")?.taskId ?? "product-build",
    provider: "infinity-native",
    model: "venture-build-orchestration-v1",
    reasoningSummary: landing
      ? "Generate the validation landing artifact. This is not the full CRE product."
      : "Generate the evidenced MVP product from the executable plan.",
    changes: files.map((file) => ({
      operation: "create" as const,
      path: file.path,
      content: file.content,
      justification: landing ? "Validation landing artifact" : "Venture-specific MVP artifact",
    })),
    dependencyChanges: [],
    migrationChanges: [],
    testsAdded: ["tests/domain.test.ts"],
    expectedBehavior: plan.productRequirements.successCriteria,
    assumptions: ["Internal sandbox only. No live providers."],
  };
}

export async function materializeVentureArtifact(input: {
  plan: ExecutableVenturePlan;
  buildPackage: VentureBuildPackage;
  omitFooter?: boolean;
}): Promise<{
  artifact: VentureBuildArtifact;
  codingRoute: ReturnType<typeof routeCodingTask>;
  changeSet: CodeChangeSet;
}> {
  const codingRoute = routeCodingTask({
    taskType: "IMPLEMENT_FEATURE",
    complexity: "medium",
    availableProviders: ["openai", "anthropic", "gemini"],
  });
  const changeSet = buildArtifactChangeSet(input.plan, input.buildPackage);
  if (input.omitFooter) {
    changeSet.changes = changeSet.changes.filter((change) => change.path !== "components/venture-footer.tsx");
    const page = changeSet.changes.find((change) => change.path === "app/page.tsx");
    if (page?.content) {
      page.content = page.content.replace(/<VentureFooter \/>/g, "").replace(/import \{ VentureFooter \}[^\n]+\n/, "");
    }
  }
  const runId = randomUUID();
  const sandbox = new VentureSandbox(input.plan.organizationId, input.buildPackage.packageId, runId);
  const engine = new WorkspaceMutationEngine(sandbox, `cs_${runId}`);
  const applied = await engine.applyChangeSet(changeSet, {
    codingTaskId: changeSet.taskId,
    featureContractIds: [input.buildPackage.packageId],
    allowedPaths: [
      "package.json",
      "tsconfig.json",
      "next-env.d.ts",
      "app",
      "components",
      "lib",
      "styles",
      "tests",
      "artifact-manifest.json",
    ],
      maxChanges: 32,
  });
  if (applied.rejected.length) {
    throw new Error(`artifact_mutation_rejected:${applied.rejected.map((item) => item.reason).join(",")}`);
  }
  const packageJson = changeSet.changes.find((change) => change.path === "package.json")?.content ?? "";
  const lockfile = await synchronizeGeneratedNpmLockfile(packageJson);
  try {
    await sandbox.writeTextFile("package-lock.json", lockfile);
  } catch {
    // Lockfiles can exceed the sandbox per-file byte ceiling. artifact.files is canonical.
  }
  const files: GeneratedArtifactFile[] = [];
  for (const change of changeSet.changes) {
    if (!change.content) continue;
    files.push({ path: change.path, content: await sandbox.readTextFile(change.path) });
  }
  files.push({ path: "package-lock.json", content: lockfile });
  const artifactId = artifactIdFor(input.plan, input.buildPackage);
  return {
    artifact: {
      artifactId,
      artifactVersion: 1,
      artifactType: "nextjs_web_product",
      ventureId: input.plan.ventureId,
      planId: input.plan.planId,
      packageId: input.buildPackage.packageId,
      workspaceReference: sandbox.workspaceReference,
      files,
      realProductArtifact: true,
      lineage: creSuccessorLineage(input.plan),
    },
    codingRoute,
    changeSet,
  };
}
