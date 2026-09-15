import type { PublicAgentProjection, PublicDepartmentProjection } from "@/lib/infinity/public-operations-projection/types";
import { departmentMotion } from "@/lib/infinity/public-operations-room/format";
import { PublicAgentNode } from "./public-agent-node";
import styles from "./operations-room.module.css";

export function DepartmentZone({
  department,
  agents,
}: {
  department: PublicDepartmentProjection;
  agents: PublicAgentProjection[];
}) {
  const motion = departmentMotion(department.public_status);
  return (
    <article
      className={`${styles.zone} ${styles[motion]}`}
      data-department-id={department.public_name}
      data-department-status={department.public_status}
      data-department-motion={motion}
    >
      <h3 className={styles.zoneLabel}>{department.public_name}</h3>
      <p className={styles.zoneStatus}>{department.public_status}</p>
      <p className={styles.zoneActivity}>{department.generic_activity_label}</p>
      <p className={styles.zoneCount}>{`${department.active_agent_count} active`}</p>
      <div className={styles.agents} aria-label={`${department.public_name} agents`}>
        {agents.map((agent) => (
          <PublicAgentNode key={agent.public_agent_id} agent={agent} />
        ))}
      </div>
    </article>
  );
}
