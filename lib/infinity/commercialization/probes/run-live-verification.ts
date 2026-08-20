import { readFileSync } from "node:fs";
import { join } from "node:path";
import { redactSecrets } from "@/lib/infinity/launch-gateway/redaction";
import { CommercializationStore } from "../store";
import {
  buildProviderInventory,
  generateProbeDomainNames,
  probeDnsLive,
  probeHostingLive,
  probePaymentsLive,
  probeRegistrarLive,
} from "./live-probes";
import { exerciseMutationGuards } from "./mutation-guards";
import { persistLiveVerification } from "./persist";
import type { CommercialProviderVerification } from "./status";
import { COMMERCIAL_PROVIDER_VERIFICATION_MODE } from "./mode";

export type LiveVerificationReport = {
  mode: typeof COMMERCIAL_PROVIDER_VERIFICATION_MODE;
  inventory: ReturnType<typeof buildProviderInventory>;
  registrar: Awaited<ReturnType<typeof probeRegistrarLive>>;
  dns: Awaited<ReturnType<typeof probeDnsLive>>;
  hosting: Awaited<ReturnType<typeof probeHostingLive>>;
  payments: Awaited<ReturnType<typeof probePaymentsLive>>;
  mutationGuards: Awaited<ReturnType<typeof exerciseMutationGuards>>;
  commercialSpendUsd: 0;
  probeProviderCostKnown: false;
  startedAt: string;
  completedAt: string;
  persisted: CommercialProviderVerification[];
  engineStatus: "ENGINE VERIFIED";
  mutationAuthority: "LOCKED";
  harnessReady: boolean;
  liveProviderFullyVerified: boolean;
  configuredProviderFailures: number;
};

export function loadEnvLocalForProbes(): void {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep);
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

function outcome(status: string, configured: string): "PASS" | "FAIL" | "SKIP" {
  if (configured !== "CONFIGURED" || status === "NOT_CONFIGURED") return "SKIP";
  if (status === "FAILED" || status === "UNAVAILABLE") return "FAIL";
  return "PASS";
}

export function formatLiveVerificationSummary(report: LiveVerificationReport): string {
  const registrar = outcome(report.registrar.status, report.inventory.registrar.configured);
  const dns = outcome(report.dns.status, report.inventory.dns.configured);
  const hosting = outcome(report.hosting.status, report.inventory.hosting.configured);
  const payments = outcome(report.payments.status, report.inventory.payments.configured);
  const readyLine = report.liveProviderFullyVerified
    ? "YES — LIVE COMMERCIAL PROVIDER CAPABILITY VERIFICATION V1 VERIFIED READ-ONLY"
    : report.harnessReady
      ? "YES — VERIFICATION HARNESS VERIFIED; LIVE PROVIDERS NOT FULLY CONFIGURED"
      : "NO — LIVE COMMERCIAL PROVIDER CAPABILITY VERIFICATION INCOMPLETE";

  return [
    "LIVE COMMERCIAL PROVIDER CAPABILITY VERIFICATION V1",
    `Mode: ${report.mode}`,
    `Engine: ${report.engineStatus}`,
    `Mutation authority: ${report.mutationAuthority}`,
    "",
    `Registrar: ${registrar}  status=${report.registrar.status}  configured=${report.inventory.registrar.configured}  env=${report.inventory.registrar.environment}  realCall=${report.registrar.realProviderCall ? "YES" : "NO"}`,
    `DNS: ${dns}  status=${report.dns.status}  configured=${report.inventory.dns.configured}  env=${report.inventory.dns.environment}  realCall=${report.dns.realProviderCall ? "YES" : "NO"} zones=${report.dns.zoneCount ?? "n/a"} records=${report.dns.recordCount ?? "n/a"}`,
    `Hosting: ${hosting}  status=${report.hosting.status}  configured=${report.inventory.hosting.configured}  env=${report.inventory.hosting.environment}  realCall=${report.hosting.realProviderCall ? "YES" : "NO"} account=${report.hosting.accountAccessible} projects=${report.hosting.projectsReadable} deployments=${report.hosting.deploymentsReadable} projectCount=${report.hosting.projectCount ?? "null"} deploymentCount=${report.hosting.deploymentCount ?? "null"}`,
    `Payments: ${payments}  status=${report.payments.status}  configured=${report.inventory.payments.configured}  env=${report.inventory.payments.environment}  realCall=${report.payments.realProviderCall ? "YES" : "NO"}`,
    "",
    `Domain purchase blocked: ${report.mutationGuards.domainRegisterBlocked ? "YES" : "NO"} (${report.mutationGuards.domainRegisterCalls} writes)`,
    `DNS mutation blocked: ${report.mutationGuards.dnsMutationBlocked ? "YES" : "NO"} (${report.mutationGuards.dnsCreateCalls} writes)`,
    `Hosting mutation blocked: ${report.mutationGuards.hostingDeployBlocked ? "YES" : "NO"} (${report.mutationGuards.hostingDeployCalls} writes)`,
    `Payment mutation blocked: ${report.mutationGuards.paymentProductBlocked ? "YES" : "NO"} (${report.mutationGuards.paymentProductCalls} writes)`,
    "",
    `Configured provider failures: ${report.configuredProviderFailures}`,
    `Probe API cost known: ${report.probeProviderCostKnown ? "YES" : "NO"}`,
    `Commercial mutation spend: $${report.commercialSpendUsd.toFixed(2)}`,
    readyLine,
  ].join("\n");
}

export async function runLiveCommercializationVerification(seed = "infinity"): Promise<LiveVerificationReport> {
  loadEnvLocalForProbes();
  const startedAt = new Date().toISOString();

  const inventory = buildProviderInventory();
  const domains = generateProbeDomainNames(seed);

  const [registrar, dns, hosting, payments, mutationGuards] = await Promise.all([
    probeRegistrarLive(domains),
    probeDnsLive(),
    probeHostingLive(),
    probePaymentsLive(),
    exerciseMutationGuards(),
  ]);

  const completedAt = new Date().toISOString();
  const store = new CommercializationStore();

  const draft = {
    mode: COMMERCIAL_PROVIDER_VERIFICATION_MODE,
    inventory,
    registrar,
    dns,
    hosting,
    payments,
    mutationGuards,
    commercialSpendUsd: 0 as const,
    probeProviderCostKnown: false as const,
    startedAt,
    completedAt,
    persisted: [] as CommercialProviderVerification[],
    engineStatus: "ENGINE VERIFIED" as const,
    mutationAuthority: "LOCKED" as const,
    harnessReady: true,
    liveProviderFullyVerified: false,
    configuredProviderFailures: 0,
  };

  draft.persisted = persistLiveVerification(store, draft);

  const configured = [
    { configured: inventory.registrar.configured, status: registrar.status },
    { configured: inventory.dns.configured, status: dns.status },
    { configured: inventory.hosting.configured, status: hosting.status },
    { configured: inventory.payments.configured, status: payments.status },
  ];
  draft.configuredProviderFailures = configured.filter(
    (row) => row.configured === "CONFIGURED" && (row.status === "FAILED" || row.status === "UNAVAILABLE"),
  ).length;
  const verifiedCount = configured.filter(
    (row) => row.configured === "CONFIGURED" && (row.status === "READ_ONLY_VERIFIED" || row.status === "DEGRADED"),
  ).length;
  const configuredCount = configured.filter((row) => row.configured === "CONFIGURED").length;
  draft.liveProviderFullyVerified =
    draft.configuredProviderFailures === 0 && configuredCount === 4 && verifiedCount === 4;
  draft.harnessReady =
    mutationGuards.domainRegisterBlocked &&
    mutationGuards.dnsMutationBlocked &&
    mutationGuards.hostingDeployBlocked &&
    mutationGuards.paymentProductBlocked &&
    mutationGuards.domainRegisterCalls === 0 &&
    mutationGuards.dnsCreateCalls === 0 &&
    mutationGuards.hostingDeployCalls === 0 &&
    mutationGuards.paymentProductCalls === 0 &&
    draft.configuredProviderFailures === 0;

  const report: LiveVerificationReport = draft;

  const serialized = redactSecrets(JSON.stringify(report));
  const secretPatterns = [/sk_live_/, /sk_test_/, /whsec_/, /vcp_/, /ghp_/, /Bearer /];
  for (const pattern of secretPatterns) {
    if (pattern.test(serialized)) {
      throw new Error("SECRET_LEAK_IN_PROBE_REPORT");
    }
  }

  return report;
}

export function configuredProviderVerificationFailed(report: LiveVerificationReport): boolean {
  return report.configuredProviderFailures > 0;
}
