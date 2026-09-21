import { qualifyProspect } from "../lib/domain";
import { validatePilotForm, submissionDedupeKey } from "../lib/form";

export function runDomainTests(): { passed: number; failed: number } {
  const qualified = qualifyProspect({
    role: "CRE broker",
    dealFrequency: "monthly",
    leaseWorkflow: true,
  });
  const unrelated = qualifyProspect({
    role: "Other",
    dealFrequency: "rarely",
    leaseWorkflow: false,
  });
  const form = validatePilotForm({
    name: "Alex Broker",
    workEmail: "alex@broker.example",
    role: "CRE broker",
    company: "Boutique CRE",
    teamSize: "4",
    dealFrequency: "Monthly",
    preferredPricing: "annual",
    pilotInterest: true,
  });
  const passed =
    qualified.qualified &&
    !unrelated.qualified &&
    form.ok &&
    submissionDedupeKey("Alex@Broker.example") === "alex@broker.example"
      ? 4
      : 0;
  return { passed, failed: 4 - passed };
}
