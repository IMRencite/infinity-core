import type { PublicAgentProjection, PublicDepartmentProjection } from "@/lib/infinity/public-operations-projection/types";
import { departmentMotion } from "@/lib/infinity/public-operations-room/format";
import { PublicAgentNode } from "./public-agent-node";
import { OverheadRoom } from "./overhead-room";

const DISPLAY: Record<PublicDepartmentProjection["public_name"], string> = {
  OPERATIONS: "Operations",
  RESEARCH: "Research",
  GROWTH: "Growth",
  VALIDATION: "Validation",
  SYSTEMS: "Systems",
  FINANCE: "Finance",
  PRODUCT: "Product",
  CREATIVE: "Creative",
  PROSPECT_INTELLIGENCE: "Prospect Intelligence",
};

export function DepartmentZone({
  department,
  agents,
}: {
  department: PublicDepartmentProjection;
  agents: PublicAgentProjection[];
}) {
  const motion = departmentMotion(department.public_status);
  const visibleAgents = agents.length > 0 ? agents : [];
  return (
    <OverheadRoom
      id={department.public_name}
      name={DISPLAY[department.public_name]}
      status={department.public_status}
      activity={department.generic_activity_label}
      motion={motion}
      agentCount={visibleAgents.length || department.active_agent_count}
      agents={visibleAgents.map((agent) => (
        <PublicAgentNode key={agent.public_agent_id} agent={agent} />
      ))}
    />
  );
}
