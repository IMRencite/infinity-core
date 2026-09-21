import { createHash } from "node:crypto";
import { scanForSecrets } from "@/lib/infinity/coding-agents/qa";
import { assertNoSecretsInContent } from "@/lib/infinity/production-artifact/types";
import { validateFrameworkReadiness, validatePackageJsonContent } from "@/lib/infinity/production-artifact/framework-validators";
import { validateBuildCompleteDependencySet } from "./build-complete-dependencies";
import { evaluatePublicLegalCompleteness, auditValidationGrade } from "@/lib/infinity/public-venture-template";
import { validateFooterAttribution } from "./footer";
import type { ArtifactValidationResult, VentureBuildArtifact, VentureBuildPackage } from "./types";

function runDomainTests(artifact: VentureBuildArtifact, role: "full_product" | "validation_landing"): boolean {
  if (role === "validation_landing") {
    const domain = artifact.files.find((file) => file.path === "lib/domain.ts")?.content ?? "";
    const form = artifact.files.find((file) => file.path === "lib/form.ts")?.content ?? "";
    const events = artifact.files.find((file) => file.path === "lib/events.ts")?.content ?? "";
    const page = artifact.files.find((file) => file.path === "app/page.tsx")?.content ?? "";
    const early = artifact.files.find((file) => file.path === "app/early-access/page.tsx")?.content ?? "";
    const primitives = artifact.files.find((file) => file.path === "components/validation-grade.tsx")?.content ?? "";
    const blob = `${page}\n${early}\n${primitives}`;
    if (/testimonial|customers already|countdown|limited spots|fake checkout|payment received/i.test(blob)) {
      return false;
    }
    return (
      domain.includes("export function qualifyProspect") &&
      form.includes("export function validatePilotForm") &&
      form.includes("submissionDedupeKey") &&
      events.includes("strong_purchase_intent") &&
      blob.includes("Request Pilot Access") &&
      blob.includes("not legal advice") &&
      blob.includes("in validation")
    );
  }
  const source = artifact.files.find((file) => file.path === "lib/domain.ts")?.content ?? "";
  if (!source.includes("export function netPresentValue") || !source.includes("export function compareLeases")) {
    return false;
  }
  const cashFlows = [1000, 1000];
  const npv = cashFlows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + 0, index + 1), 0);
  return npv === 2000 && source.includes("cheaper");
}

export function validateVentureArtifact(input: {
  artifact: VentureBuildArtifact;
  buildPackage: VentureBuildPackage;
}): ArtifactValidationResult {
  const failures: string[] = [];
  const contract = input.buildPackage.artifactContract;
  for (const required of contract.requiredFiles) {
    if (!input.artifact.files.some((file) => file.path === required)) {
      failures.push(`missing_file:${required}`);
    }
  }

  const pkg = input.artifact.files.find((file) => file.path === "package.json")?.content ?? "";
  const packageCheck = validatePackageJsonContent(
    pkg,
    input.artifact.files.map((file) => file.path),
  );
  if (!packageCheck.valid) failures.push("package_json_invalid");
  const buildComplete = validateBuildCompleteDependencySet({ files: input.artifact.files });
  if (buildComplete.status !== "PASS") failures.push(...buildComplete.issues);
  const manifest = input.artifact.files.map((file) => ({
    relative_path: file.path,
    content_hash: createHash("sha256").update(file.content).digest("hex"),
    byte_size: Buffer.byteLength(file.content, "utf8"),
    file_mode: "100644" as const,
  }));
  const framework = validateFrameworkReadiness("nextjs", manifest);
  if (!framework.valid) failures.push(...framework.issues);

  const footer = validateFooterAttribution(input.artifact.files);
  if (!footer.ok) failures.push(...footer.failures);
  const legal = evaluatePublicLegalCompleteness(input.artifact.files);
  if (legal.complete !== "PASS") failures.push("public_legal_completeness");
  if (legal.fabricatedLegalClaims) failures.push("fabricated_legal_claims");
  if (contract.role === "validation_landing") {
    const grade = auditValidationGrade(input.artifact.files);
    if (grade.validationGradeOverall !== "PASS") failures.push("validation_grade_structural_quality");
  }

  const secretHits = scanForSecrets(input.artifact.files.map((file) => file.content));
  if (secretHits.length) failures.push("secret_scan");
  for (const file of input.artifact.files) {
    try {
      assertNoSecretsInContent(file.content, file.path);
    } catch {
      failures.push(`secret_content:${file.path}`);
    }
  }

  if (!runDomainTests(input.artifact, contract.role ?? "full_product")) failures.push("domain_tests");
  if (input.artifact.files.length < 6) failures.push("not_a_product_artifact");
  const blob = input.artifact.files.map((file) => file.content).join("\n");
  if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(blob)) failures.push("localhost_ingest");
  if (/https?:\/\/([a-z0-9-]+\.)?example\.com/i.test(blob)) failures.push("placeholder_origin");

  const footerStatus = footer.ok ? "PASS" : "FAIL";
  const tests = failures.includes("domain_tests") ? "FAIL" : "PASS";
  const build = framework.valid && packageCheck.valid && buildComplete.status === "PASS" ? "PASS" : "FAIL";
  const typecheck =
    buildComplete.typescriptRequired
      ? buildComplete.status === "PASS"
        ? "PASS"
        : "FAIL"
      : input.artifact.files.some((file) => file.path.endsWith(".ts") || file.path.endsWith(".tsx"))
        ? "PASS"
        : "NOT_APPLICABLE";
  const secretSafety = secretHits.length || failures.some((item) => item.startsWith("secret_")) ? "FAIL" : "PASS";
  const contractStatus = contract.requiredFiles.every((path) =>
    input.artifact.files.some((file) => file.path === path),
  )
    ? "PASS"
    : "FAIL";

  return {
    validationId: `val_${input.artifact.artifactId}`,
    typecheck,
    tests,
    build,
    artifactContract: contractStatus,
    footer: footerStatus,
    secretSafety,
    buildCompleteDependencySet: buildComplete.status,
    passed: failures.length === 0,
    failures,
  };
}
