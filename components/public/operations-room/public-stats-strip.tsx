import type { PublicCount, PublicOperationsProjection } from "@/lib/infinity/public-operations-projection/types";
import { formatPublicCount } from "@/lib/infinity/public-operations-room/format";
import styles from "./operations-room.module.css";

function Stat({ label, value, testId }: { label: string; value: PublicCount; testId: string }) {
  return (
    <div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue} data-stat-key={testId} data-stat-value={formatPublicCount(value)}>
        {formatPublicCount(value)}
      </p>
    </div>
  );
}

export function PublicStatsStrip({ projection }: { projection: PublicOperationsProjection }) {
  return (
    <section className={styles.statsStrip} aria-label="Public operating statistics">
      <h2 className={styles.roomTitle}>Public Stats</h2>
      <div className={styles.statGrid}>
        <Stat label="Agents Active" value={projection.active_public_agents} testId="active_public_agents" />
        <Stat label="Agents Idle" value={projection.idle_public_agents} testId="idle_public_agents" />
        <Stat label="Ventures Started" value={projection.ventures_started_count} testId="ventures_started_count" />
        <Stat label="Ventures Operating" value={projection.ventures_operating_count} testId="ventures_operating_count" />
        <Stat label="Missions Completed" value={projection.missions_completed_count} testId="missions_completed_count" />
        <Stat label="Autonomous Hours" value={projection.autonomous_operating_hours} testId="autonomous_operating_hours" />
        <Stat label="Deployments Completed" value={projection.deployments_completed_count} testId="deployments_completed_count" />
        <Stat label="Assets Created" value={projection.public_assets_created_count} testId="public_assets_created_count" />
        <Stat label="Research Cycles" value={projection.research_cycles_completed_count} testId="research_cycles_completed_count" />
      </div>
    </section>
  );
}
