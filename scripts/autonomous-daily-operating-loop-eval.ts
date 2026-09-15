import { mkdirSync, writeFileSync } from "node:fs";
import { executeAutonomousDailyOperatingLoop } from "../lib/infinity/autonomous-operating-loop/loop";
import { ensureOccupancyNpvCanonicalWork } from "../lib/infinity/canonical-work/seed";
import { loadCapitalLedger } from "../lib/infinity/financial-truth/capital-ledger";
import { projectVentureSpendAuthority } from "../lib/infinity/financial-truth/spend-authority";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";

ensureOccupancyNpvCanonicalWork();
const result = executeAutonomousDailyOperatingLoop({
  persist: true,
  createMission: false,
  executeExternal: false,
});
const authority = projectVentureSpendAuthority(loadCapitalLedger(), CRE_VENTURE_ID);
const occupancy = result.observation.occupancy;
const payload = {
  decision: result.decision,
  explanation: result.explanation,
  portfolio_state: result.portfolio_state,
  occupancy_state: occupancy ? result.state.venture_states[occupancy.venture_id] ?? result.venture_state : result.venture_state,
  mission_created: result.mission_created,
  action_executed: result.action_executed,
  daily_review_ran: result.daily_review_ran,
  occupancy,
  askreview: result.observation.askreview,
  finance: {
    remaining_spend_authority: authority.remaining_spend_authority,
    unused_allocation: authority.unused_allocation,
    committed: authority.committed_amount,
    actual_spend: authority.actual_spend_amount,
    paid_acquisition: authority.paid_acquisition_authority,
    money_moved: authority.money_moved,
  },
  gates: result.gates,
};
mkdirSync(".qc-runtime", { recursive: true });
writeFileSync(".qc-runtime/autonomous-daily-operating-loop-eval.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
