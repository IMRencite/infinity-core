import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  classifyVercelHostingGovernance,
  CRE_VERCEL_DEPLOYMENT_ID,
  executeVercelHostingPlanVerification,
} from "../vercel-hosting-plan-verification";

const TEAM = "team_expected_fixture";

function vercelFetch(input: { plan?: string; status?: string; teamId?: string } = {}): typeof fetch {
  const plan = input.plan ?? "hobby";
  const teamId = input.teamId ?? TEAM;
  const fetchImpl: typeof fetch = async (url) => {
    const path = String(url);
    if (path.includes("/v2/user")) {
      return new Response(JSON.stringify({ user: { uid: "usr_fixture" } }), { status: 200 });
    }
    if (path.includes(`/v2/teams/${TEAM}`)) {
      return new Response(
        JSON.stringify({
          id: TEAM,
          slug: "imr-fixture",
          billing: { plan, status: input.status ?? "active" },
        }),
        { status: 200 },
      );
    }
    if (path.includes(`/v13/deployments/${CRE_VERCEL_DEPLOYMENT_ID}`)) {
      return new Response(
        JSON.stringify({
          uid: CRE_VERCEL_DEPLOYMENT_ID,
          url: "infinity-validation-cre-lease-npv-e72beb7b-br9xupk59.vercel.app",
          teamId,
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ error: "unhandled" }), { status: 404 });
  };
  return fetchImpl;
}

describe("VERCEL HOSTING PLAN VERIFICATION V1", () => {
  beforeEach(() => {
    process.env.VERCEL_TOKEN = "vercel_fixture_token_not_real";
    process.env.VERCEL_TEAM_ID = TEAM;
  });

  afterEach(() => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
  });

  it("classifies governance without inferring paid from a working deployment", () => {
    expect(classifyVercelHostingGovernance("HOBBY")).toEqual({
      state: "VERCEL_PAID_HOSTING_REQUIRED",
      hostingPurchaseRequired: "YES",
    });
    expect(classifyVercelHostingGovernance("PRO")).toEqual({
      state: "VERCEL_PRO_ALREADY_ACTIVE",
      hostingPurchaseRequired: "NO",
    });
    expect(classifyVercelHostingGovernance("UNKNOWN")).toEqual({
      state: "VERCEL_PLAN_VERIFICATION_REQUIRED",
      hostingPurchaseRequired: "YES",
    });
  });

  it("reads Hobby as unpaid and does not treat the existing deployment as Pro proof", async () => {
    const result = await executeVercelHostingPlanVerification({
      reloadEnv: false,
      fetchImpl: vercelFetch({ plan: "hobby" }),
    });
    expect(result.account.ownershipVerified).toBe("YES");
    expect(result.plan.current).toBe("HOBBY");
    expect(result.plan.paid).toBe("NO");
    expect(result.plan.commercialProductionSupport).toBe("NO");
    expect(result.deployment.covered).toBe("YES");
    expect(result.governance.state).toBe("VERCEL_PAID_HOSTING_REQUIRED");
    expect(result.governance.hostingPurchaseRequired).toBe("YES");
    expect(result.purchases).toBe(0);
    expect(result.planChanges).toBe(0);
    expect(result.deployments).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/vercel_fixture_token_not_real/);
  });

  it("reads Pro as already-active paid hosting", async () => {
    const result = await executeVercelHostingPlanVerification({
      reloadEnv: false,
      fetchImpl: vercelFetch({ plan: "pro" }),
    });
    expect(result.plan.current).toBe("PRO");
    expect(result.plan.paid).toBe("YES");
    expect(result.plan.commercialProductionSupport).toBe("YES");
    expect(result.governance.state).toBe("VERCEL_PRO_ALREADY_ACTIVE");
    expect(result.governance.hostingPurchaseRequired).toBe("NO");
    expect(result.purchases).toBe(0);
  });
});
