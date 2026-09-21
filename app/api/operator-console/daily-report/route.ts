import { NextResponse } from "next/server";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { hqPrivateApiDecision } from "@/lib/infinity/hq-production-deployment/private-api";
import {
  generateAndPersistFounderDailyReportDurable,
  loadFounderDailyReportIndexDurable,
  readFounderDailyReportDurable,
} from "@/lib/infinity/founder-daily-reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const decision = hqPrivateApiDecision(await getOperatorOrgContext());
  if (!decision.ok) {
    return NextResponse.json(decision.body, {
      status: decision.status,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (date) {
    const report = await readFounderDailyReportDurable(date);
    return NextResponse.json(
      { ok: Boolean(report), report, index: await loadFounderDailyReportIndexDurable() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const report = await generateAndPersistFounderDailyReportDurable();
  return NextResponse.json(
    { ok: true, report, index: await loadFounderDailyReportIndexDurable() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
