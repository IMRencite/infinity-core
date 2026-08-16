import { MOCK_PROVIDER_KEY } from "../constants";
import type {
  AdapterContext,
  AdapterSimulationResult,
  ExternalActionAdapter,
} from "./contract";

function mockId(prefix: string, target: string): string {
  const slug = target.replace(/[^a-z0-9.-]/gi, "-").slice(0, 40);
  return `sim_${prefix}_${slug}_${hashString(target).slice(0, 8)}`;
}

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export class MockInfinityAdapter implements ExternalActionAdapter {
  capabilities = {
    provider: MOCK_PROVIDER_KEY,
    adapterKey: MOCK_PROVIDER_KEY,
    supportedActions: [
      "domain.search",
      "domain.register",
      "hosting.create_project",
      "hosting.deploy",
      "hosting.verify_deployment",
      "repository.create",
      "repository.push",
      "dns.configure",
      "analytics.configure",
    ],
    supportsSimulation: true,
    supportsVerification: true,
    supportsRollback: false,
    networkRequired: false,
    financialSideEffectPossible: false,
    liveExecutionEnabled: false,
  };

  async validate(ctx: AdapterContext): Promise<{ valid: boolean; issues: string[] }> {
    if (!this.capabilities.supportedActions.includes(ctx.actionType)) {
      return { valid: false, issues: ["unsupported_action_for_adapter"] };
    }
    if (!ctx.target) {
      return { valid: false, issues: ["missing_target"] };
    }
    return { valid: true, issues: [] };
  }

  async estimate(ctx: AdapterContext) {
    if (ctx.actionType === "domain.register") {
      return { estimatedCostUsd: 12, currency: "USD" };
    }
    return { estimatedCostUsd: 0, currency: "USD" };
  }

  async simulate(ctx: AdapterContext): Promise<AdapterSimulationResult> {
    const base = mockId(ctx.actionType.split(".")[0] ?? "action", ctx.target);
    const externalIds: Record<string, string> = { simulation_id: base };
    switch (ctx.actionType) {
      case "domain.register":
        externalIds.domain_id = `${base}.mock`;
        break;
      case "hosting.create_project":
        externalIds.project_id = `prj_${base}`;
        break;
      case "hosting.deploy":
        externalIds.deployment_id = `dep_${base}`;
        externalIds.url = `https://${ctx.target}.mock.infinity.local`;
        break;
      case "repository.create":
        externalIds.repository_id = `repo_${base}`;
        externalIds.repository_full_name = String(
          ctx.payload.repository_full_name ?? `infinity-test/${ctx.target}`,
        );
        break;
      case "repository.push":
        externalIds.commit_sha = `sim_commit_${hashString(ctx.target)}`;
        externalIds.repository_id = `repo_${base}`;
        break;
      case "analytics.configure":
        externalIds.property_id = `ga_${base}`;
        break;
      default:
        break;
    }
    return {
      simulated: true,
      externalIds,
      manifest: {
        provider: MOCK_PROVIDER_KEY,
        action_type: ctx.actionType,
        target: ctx.target,
        simulation: true,
        live: false,
      },
    };
  }

  async execute(_ctx: AdapterContext): Promise<AdapterSimulationResult> {
    throw new Error("Live adapter execution is disabled in Launch Gateway v1 mock provider");
  }

  async verify(ctx: AdapterContext, result: AdapterSimulationResult) {
    const ok =
      result.simulated === true &&
      Boolean(result.externalIds.simulation_id) &&
      result.manifest.action_type === ctx.actionType;
    return {
      verified: ok,
      details: ok ? [] : ["simulation_verification_failed"],
    };
  }
}

export const mockInfinityAdapter = new MockInfinityAdapter();
