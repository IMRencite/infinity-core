import Link from "next/link";
import type { MissionInspectorData } from "@/lib/infinity/hq/types";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { HqSection } from "./empty-state";

function JsonBlock({ title, data }: { title: string; data: unknown }) {
  if (data === null || (Array.isArray(data) && data.length === 0)) {
    return (
      <HqSection title={title}>
        <p className="px-4 py-4 text-[13px] text-zinc-500">No data yet</p>
      </HqSection>
    );
  }
  return (
    <HqSection title={title}>
      <pre className="max-h-64 overflow-auto px-4 py-3 text-[11px] text-zinc-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </HqSection>
  );
}

export function MissionInspectorView({
  missionId,
  data,
}: {
  missionId: string;
  data: MissionInspectorData;
}) {
  const title =
    typeof data.mission?.title === "string" ? data.mission.title : missionId.slice(0, 8);

  return (
    <div className="space-y-4">
      <header>
        <Link href="/dashboard" className="text-[12px] text-sky-400 hover:underline">
          ← Infinity HQ
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">Mission Inspector</h1>
        <p className="text-[13px] text-zinc-400">{title}</p>
        <p className="font-mono text-[11px] text-zinc-600">{missionId}</p>
      </header>

      <JsonBlock title="1. Mission identity" data={data.mission} />
      <JsonBlock title="2. Objective and policies" data={data.mission?.objectives ?? null} />
      <JsonBlock title="3. Runtime lifecycle" data={data.runtime} />
      <JsonBlock title="4. Transition timeline" data={data.transitions} />
      <JsonBlock title="5. Checkpoints" data={data.checkpoints} />
      <JsonBlock title="6. Discovery / opportunities" data={data.opportunities} />
      <JsonBlock title="7. Evaluation output" data={null} />
      <JsonBlock title="8. Allocation state" data={data.allocationProposals} />
      <JsonBlock
        title="8b. Autonomous plan execution (read-only)"
        data={
          data.planExecution
            ? {
                ...data.planExecution,
                notice:
                  "Autonomous internal execution — not deployed or published.",
              }
            : null
        }
      />
      <JsonBlock
        title="8c. Venture assembly (read-only)"
        data={
          data.ventureAssembly
            ? {
                ...data.ventureAssembly,
                notice: "Internal venture package — not launched or published.",
              }
            : null
        }
      />
      <JsonBlock title="9. Validation runs" data={data.validationRuns} />
      <JsonBlock title="10. Reasoning sessions" data={data.reasoningSessions} />
      <JsonBlock title="11. Executive decisions" data={data.executiveDecisions} />
      <JsonBlock title="12. Plans and plan steps" data={null} />
      <JsonBlock title="13. Engine jobs" data={data.engineJobs} />
      <JsonBlock title="14. Worker runs" data={data.workerRuns} />
      <JsonBlock title="15. Blueprint (not executed)" data={data.blueprint} />
      <JsonBlock title="16. Events" data={data.events} />
      <JsonBlock
        title="17. Blocking conditions"
        data={data.runtime?.context ?? data.runtime?.last_error ?? null}
      />
      <p className="text-[11px] text-zinc-600">
        Related deep links:{" "}
        <Link href={HQ_ROUTES.runtime} className="text-sky-400 hover:underline">
          Runtime
        </Link>
        {" · "}
        <Link href={HQ_ROUTES.validation} className="text-sky-400 hover:underline">
          Validation
        </Link>
      </p>
    </div>
  );
}
