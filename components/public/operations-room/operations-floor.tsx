import type { PublicAgentProjection, PublicDepartmentProjection } from "@/lib/infinity/public-operations-projection/types";
import { DepartmentZone } from "./department-zone";
import styles from "./operations-room.module.css";

export function OperationsFloor({
  departments,
  agents,
}: {
  departments: PublicDepartmentProjection[];
  agents: PublicAgentProjection[];
}) {
  return (
    <section className={styles.room} data-public-operations-room="true" aria-label="Live operations room">
      <h2 className={styles.roomTitle}>Live Operations Room</h2>
      <div className={styles.floor} data-room-layout="desktop">
        {departments.map((department) => (
          <DepartmentZone
            key={`desk-${department.public_name}`}
            department={department}
            agents={agents.filter((agent) => agent.department === department.public_name)}
          />
        ))}
      </div>
      <div className={styles.tabletFloor} data-room-layout="tablet">
        {departments.map((department) => (
          <DepartmentZone
            key={`tab-${department.public_name}`}
            department={department}
            agents={agents.filter((agent) => agent.department === department.public_name)}
          />
        ))}
      </div>
      <div className={styles.mobileCards} data-room-layout="mobile">
        {departments.map((department) => (
          <DepartmentZone
            key={`mob-${department.public_name}`}
            department={department}
            agents={agents.filter((agent) => agent.department === department.public_name)}
          />
        ))}
      </div>
    </section>
  );
}
