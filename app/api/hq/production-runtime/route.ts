import { NextResponse } from "next/server";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { hqPrivateApiDecision } from "@/lib/infinity/hq-production-deployment/private-api";
import { fetchCanonicalProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-binding";
import { evaluateHqProductionRuntimeSecretExposureGate } from "@/lib/infinity/growth-engine/hq-runtime-projection";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const decision = hqPrivateApiDecision(await getOperatorOrgContext());
  if (!decision.ok) {
    return NextResponse.json(decision.body, {
      status: decision.status,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const read = await fetchCanonicalProductionOperatingState();
  const payload = read.ok
    ? { status: "BOUND", freshness: read.freshness, mutation: false, state: read.state }
    : { status: "RUNTIME_UNREACHABLE", freshness: "STALE", mutation: false, state: null };
  const secrets = evaluateHqProductionRuntimeSecretExposureGate(payload);
  if (secrets.result !== "PASS") {
    return NextResponse.json({ status: "RUNTIME_UNREACHABLE", freshness: "STALE", mutation: false, state: null });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
}
