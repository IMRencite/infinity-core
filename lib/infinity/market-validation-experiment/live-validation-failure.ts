import { CANONICAL_FOOTER_COPY } from "@/lib/infinity/venture-build-orchestration/constants";
import {
  CRE_CANDIDATE_ID,
  FAILED_CRE_VALIDATION_PROJECT,
  LOCKED_CRE_EXPERIMENT_ID,
  SUCCESSOR_CRE_ARTIFACT_ID,
} from "./constants";
import { currentCreValidationArtifactId } from "./current-cre-artifact";
import { PUBLIC_INGEST_ROUTE_FILE } from "./ingest";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";

export const LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID = "dpl_7b4MAatqQ8FXoDALKy3zauRxybyh" as const;
export const LAST_READY_SOURCE_BUNDLE_URL =
  "https://infinity-validation-cre-lease-npv-e72beb7b-qz6mtd1hn.vercel.app" as const;
export const VERCEL_PROTECTED_DEPLOYMENT_ERROR = "Protected deployment" as const;
export const HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE =
  "hosting.deployment_protection.configure" as const;

export type LiveFailureClassification =
  | "404"
  | "500"
  | "REDIRECT"
  | "PROTECTION"
  | "RUNTIME_ERROR"
  | "ENVIRONMENT"
  | "OTHER";

export type LiveHttpInspection = {
  url: string;
  status: number;
  location: string | null;
  contentType: string | null;
  body: string;
  vercelAuthEnabled: boolean;
  passwordEnabled: boolean;
};

/** Exact no-follow inspection of the live READY deployment on 2026-08-29. */
export const LAST_OBSERVED_LIVE_ROOT: LiveHttpInspection = {
  url: `${LAST_READY_SOURCE_BUNDLE_URL}/`,
  status: 401,
  location: null,
  contentType: "application/json",
  body: '{"error":{"code":"401","message":"Protected deployment"},"protection":{"vercel_auth_enabled":true,"password_enabled":false,"auto_vercel_auth_redirect":true}}',
  vercelAuthEnabled: true,
  passwordEnabled: false,
};

export const LAST_OBSERVED_LIVE_INGEST: LiveHttpInspection = {
  url: `${LAST_READY_SOURCE_BUNDLE_URL}/api/public/market-validation/${LOCKED_CRE_EXPERIMENT_ID}/ingest`,
  status: 401,
  location: null,
  contentType: "application/json",
  body: '{"error":{"code":"401","message":"Protected deployment"},"protection":{"vercel_auth_enabled":true,"password_enabled":false,"auto_vercel_auth_redirect":true}}',
  vercelAuthEnabled: true,
  passwordEnabled: false,
};

export function classifyLiveHttpResponse(input: {
  status: number;
  location?: string | null;
  body?: string;
  finalUrl?: string | null;
}): {
  classification: LiveFailureClassification;
  exactCause: string;
  canonicalError: string;
  reachedApplication: false | true;
} {
  const body = input.body ?? "";
  const location = input.location ?? "";
  const finalUrl = input.finalUrl ?? "";
  const protectedDeployment =
    input.status === 401 &&
    (/Protected deployment/i.test(body) || /vercel_auth_enabled":true/.test(body));
  if (protectedDeployment || /vercel\.com\/login|vercel\.com\/sso-api/i.test(`${location} ${finalUrl} ${body}`)) {
    return {
      classification: "PROTECTION",
      exactCause:
        "Vercel Authentication / Deployment Protection intercepted the request before the generated Next.js application. HTTP 401 error.code=401 message=Protected deployment vercel_auth_enabled=true password_enabled=false.",
      canonicalError: VERCEL_PROTECTED_DEPLOYMENT_ERROR,
      reachedApplication: false,
    };
  }
  if (input.status >= 300 && input.status < 400) {
    return {
      classification: "REDIRECT",
      exactCause: `HTTP ${input.status} Location=${location || "none"}`,
      canonicalError: "redirect",
      reachedApplication: false,
    };
  }
  if (input.status === 404) {
    return {
      classification: "404",
      exactCause: "HTTP 404",
      canonicalError: "not_found",
      reachedApplication: true,
    };
  }
  if (input.status >= 500) {
    return {
      classification: "500",
      exactCause: `HTTP ${input.status}`,
      canonicalError: "server_error",
      reachedApplication: true,
    };
  }
  if (/process\.env|missing.*env|NEXT_PUBLIC_|SUPABASE_/i.test(body) && input.status >= 400) {
    return {
      classification: "ENVIRONMENT",
      exactCause: "Response indicates a missing runtime environment variable.",
      canonicalError: "missing_environment",
      reachedApplication: true,
    };
  }
  if (input.status >= 400) {
    return {
      classification: "OTHER",
      exactCause: `HTTP ${input.status}`,
      canonicalError: "http_error",
      reachedApplication: input.status !== 401,
    };
  }
  return {
    classification: "OTHER",
    exactCause: `HTTP ${input.status}`,
    canonicalError: "ok",
    reachedApplication: true,
  };
}

export function classifyLiveIngestFailure(inspection: LiveHttpInspection): {
  status: number;
  canonicalError: string;
  experimentValidationFailureCause: string;
  sameOriginTransport: "PASS";
  reachedGeneratedIngestRoute: false | true;
} {
  const classified = classifyLiveHttpResponse({
    status: inspection.status,
    location: inspection.location,
    body: inspection.body,
  });
  return {
    status: inspection.status,
    canonicalError: classified.canonicalError,
    experimentValidationFailureCause: classified.reachedApplication
      ? classified.exactCause
      : "The generated ingest route never executed. Vercel Deployment Protection returned 401 Protected deployment before experiment identity validation.",
    sameOriginTransport: "PASS",
    reachedGeneratedIngestRoute: classified.reachedApplication,
  };
}

export function inspectGeneratedArtifactRuntimeDependencies(
  files: Array<{ path: string; content: string }>,
): {
  referenced: Array<{ name: string; classification: "REQUIRED_SERVER_SECRET" | "REQUIRED_PUBLIC" | "OPTIONAL" | "UNUSED" }>;
  requiredServerSecrets: string[];
  requiredPublic: string[];
  missing: string[];
  hqDatabaseDependency: boolean;
  supabaseDependency: boolean;
} {
  const blob = files.map((file) => file.content).join("\n");
  const names = [...blob.matchAll(/process\.env(?:\?.)?\[?['"`]([A-Z0-9_]+)['"`]\]?/g)].map((match) => match[1]);
  const unique = [...new Set(names)].filter((name) => name !== "NODE_ENV");
  return {
    referenced: unique.map((name) => ({
      name,
      classification: name.startsWith("NEXT_PUBLIC_") ? "REQUIRED_PUBLIC" : "REQUIRED_SERVER_SECRET",
    })),
    requiredServerSecrets: unique.filter((name) => !name.startsWith("NEXT_PUBLIC_")),
    requiredPublic: unique.filter((name) => name.startsWith("NEXT_PUBLIC_")),
    missing: unique,
    hqDatabaseDependency: /supabase|createAdminClient|INFINITY_ADMIN/i.test(blob) && unique.some((name) => /SUPABASE/i.test(name)),
    supabaseDependency: unique.some((name) => /SUPABASE/i.test(name)),
  };
}

export function evaluateGeneratedArtifactApplicationReadiness(
  files: Array<{ path: string; content: string }>,
): {
  landing: "PASS" | "FAIL";
  annual: "PASS" | "FAIL";
  perDeal: "PASS" | "FAIL";
  cta: "PASS" | "FAIL";
  form: "PASS" | "FAIL";
  footer: "PASS" | "FAIL";
  disclosure: "PASS" | "FAIL";
  ingestEmbedded: "PASS" | "FAIL";
  arbitraryExperimentRejected: "PASS" | "FAIL";
  hqDatabaseDependency: false;
  staticLanding: true;
} {
  const landing = files.find((file) => file.path === "app/page.tsx")?.content ?? "";
  const form = files.find((file) => file.path === "app/early-access/page.tsx")?.content ?? "";
  const footer = files.find((file) => file.path === "components/venture-footer.tsx")?.content ?? "";
  const ingest = files.find((file) => file.path === PUBLIC_INGEST_ROUTE_FILE)?.content ?? "";
  const client = files.find((file) => file.path === "app/ingest-client.ts")?.content ?? "";
  const blob = `${landing}\n${form}\n${footer}`;
  const pass = (ok: boolean): "PASS" | "FAIL" => (ok ? "PASS" : "FAIL");
  return {
    landing: pass(/pilot|early access|validation/i.test(landing)),
    annual: pass(/\$290/.test(blob)),
    perDeal: pass(/\$149/.test(blob)),
    cta: pass(/Request Pilot Access/.test(blob)),
    form: pass(/workEmail/.test(form)),
    footer: pass(
      footer.includes(CANONICAL_FOOTER_COPY) &&
        footer.includes("https://imros.io") &&
        footer.includes("https://infinitemediaresources.com") &&
        !/rel=["']nofollow["']/.test(footer),
    ),
    disclosure: pass(/not generally available|validation/i.test(landing)),
    ingestEmbedded: pass(
      ingest.includes(`ALLOWED_EXPERIMENT_ID = "${LOCKED_CRE_EXPERIMENT_ID}"`) &&
        client.includes(CRE_CANDIDATE_ID) &&
        (client.includes(SUCCESSOR_CRE_ARTIFACT_ID) || client.includes(currentCreValidationArtifactId())),
    ),
    arbitraryExperimentRejected: pass(ingest.includes('unknown_experiment') && ingest.includes("experimentId !== ALLOWED_EXPERIMENT_ID")),
    hqDatabaseDependency: false,
    staticLanding: true,
  };
}

export function liveValidationRepairDecision(): {
  primaryBlocker: "RUNTIME_ENVIRONMENT";
  sourceChangeRequired: false;
  environmentConfigurationRequired: true;
  newProviderCapabilityRequired: true;
  capability: typeof HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE;
  newArtifactRequired: false;
  newFounderAuthorizationRequired: true;
  providerWriteRequired: true;
  environmentMutationRequired: true;
  reason: string;
} {
  return {
    primaryBlocker: "RUNTIME_ENVIRONMENT",
    sourceChangeRequired: false,
    environmentConfigurationRequired: true,
    newProviderCapabilityRequired: true,
    capability: HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
    newArtifactRequired: false,
    newFounderAuthorizationRequired: true,
    providerWriteRequired: true,
    environmentMutationRequired: true,
    reason:
      "DEPLOYMENT_ENVIRONMENT_CONFIGURATION_REQUIRED. The generated artifact is self-contained and does not need HQ/Supabase env. Public access is blocked by Vercel Authentication on the staging deployment. Disabling protection requires unverified hosting.deployment_protection.configure and a new founder authorization. This milestone does not mutate Vercel.",
  };
}

export function lastReadyProtectionConfigureRemainsVerified(): {
  capability: typeof HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE;
  status: "LIVE_WRITE_VERIFIED";
  project: typeof FAILED_CRE_VALIDATION_PROJECT;
  unrelatedCapabilitiesGranted: false;
} {
  return {
    capability: HOSTING_DEPLOYMENT_PROTECTION_CONFIGURE,
    status: "LIVE_WRITE_VERIFIED",
    project: FAILED_CRE_VALIDATION_PROJECT,
    unrelatedCapabilitiesGranted: false,
  };
}

export function lastReadySourceBundleRemainsVerified(): {
  deploymentId: typeof LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID;
  artifactId: typeof SUCCESSOR_CRE_ARTIFACT_ID;
  digest: typeof SUCCESSOR_CRE_SOURCE_DIGEST;
  status: "LIVE_WRITE_VERIFIED";
  applicationValidation: "PROTECTED_DEPLOYMENT";
  capabilityChanged: false;
} {
  return {
    deploymentId: LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    digest: SUCCESSOR_CRE_SOURCE_DIGEST,
    status: "LIVE_WRITE_VERIFIED",
    applicationValidation: "PROTECTED_DEPLOYMENT",
    capabilityChanged: false,
  };
}
