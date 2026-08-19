import type { InspectorJourney } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

export function founderIdeaJourney(artifact: HqWorkArtifact): InspectorJourney {
  const status = String(artifact.metadata.status ?? "");
  const researched = !["DRAFT", "SUBMITTED", ""].includes(status);
  const monetized = artifact.metadata.monetizationScore != null && Number(artifact.metadata.monetizationScore) > 0;
  const selected = Boolean(artifact.metadata.infinityDecision);
  const validated = ["VALIDATING", "BUILD_APPROVED", "BUILDING", "COMPLETED"].includes(status);
  const built = ["BUILDING", "COMPLETED"].includes(status);
  const launched = false;
  const measured = false;
  const flags = {
    DISCOVERED: true,
    RESEARCHED: researched,
    MONETIZED: monetized,
    SELECTED: selected,
    VALIDATED: validated,
    BUILT: built,
    LAUNCHED: launched,
    MEASURED: measured,
  } as const;
  const phases = Object.keys(flags) as Array<keyof typeof flags>;
  const firstIncomplete = phases.findIndex((phase) => !flags[phase]);
  const currentIndex = firstIncomplete === -1 ? phases.length - 1 : firstIncomplete;
  return {
    phases: phases.map((phase, index) => ({
      phase,
      complete: flags[phase],
      current: index === currentIndex && !flags[phase],
    })),
  };
}
