import { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import { CodingAgentStore } from "@/lib/infinity/coding-agents/store";
import { CommercializationStore } from "@/lib/infinity/commercialization/store";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import { ZeroToProductionStore } from "./store";
import type { ZtpContext } from "./orchestrator";

export function createZtpContext(treasury?: TreasuryStore | null): ZtpContext {
  return {
    ztp: new ZeroToProductionStore(),
    founder: new FounderIdeaStore(),
    coding: new CodingAgentStore(),
    commercial: new CommercializationStore(),
    treasury: treasury ?? null,
  };
}
