import { describe, expect, it } from "vitest";
import { composeOccupancynpvPaymentReactivationFiles } from "../occupancynpv-payment-reactivation-surface";
import { OCCUPANCYNPV_QC_ALPHA_EMAIL, OCCUPANCYNPV_QC_BETA_EMAIL, isOccupancynpvGovernedQcEmail } from "@/lib/infinity/occupancynpv-product/qc-identity";
import { readFileSync } from "node:fs";

describe("OCCUPANCYNPV_LIVE_INTAKE_AUTH_QC_V1", () => {
  it("fail-closes local ACK and persists through durable intake instead of fake contract success", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const route = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/api/occupancynpv/improvement-intake/route.ts")?.content ?? "";
    const durable = composed.files.find((file) => file.path.replace(/\\/g, "/") === "lib/occupancynpv/durable.ts")?.content ?? "";
    expect(route).toContain("durablePersistImprovementIntake");
    expect(route).toContain("CANONICAL_INTAKE_UNAVAILABLE");
    expect(route).toContain("source:");
    expect(route).not.toContain('contract: "VentureImprovementIntakeContract"');
    expect(route).toContain("x-infinity-qc-force-intake-failure");
    expect(durable).toContain("occupancynpv-improvement-intake");
    expect(durable).toContain("pending/");
    expect(durable).toContain(OCCUPANCYNPV_QC_ALPHA_EMAIL);
    expect(durable).toContain(OCCUPANCYNPV_QC_BETA_EMAIL);
    expect(durable).toContain("internal_qa_");
  });

  it("HQ improvement GET hydrates the canonical outbox before projection", () => {
    const hq = readFileSync("app/api/hq/ventures/[ventureId]/improvement/route.ts", "utf8");
    expect(hq).toContain("hydrateCanonicalImprovementIntakeFromOutbox");
    expect(hq).toContain("projectVentureImprovementHq");
  });

  it("keeps QC identities governed and distinct from uncontrolled customers", () => {
    expect(isOccupancynpvGovernedQcEmail(OCCUPANCYNPV_QC_ALPHA_EMAIL)).toBe(true);
    expect(isOccupancynpvGovernedQcEmail(OCCUPANCYNPV_QC_BETA_EMAIL)).toBe(true);
    expect(isOccupancynpvGovernedQcEmail("random-customer@example.com")).toBe(false);
  });
});
