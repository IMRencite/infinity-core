import type { PublicOperationsProjection } from "@/lib/infinity/public-operations-projection/types";
import { formatPublicTimestamp, systemStatusLabel } from "@/lib/infinity/public-operations-room/format";
import styles from "./operations-room.module.css";

export function PublicSystemStatus({ projection }: { projection: PublicOperationsProjection }) {
  return (
    <section className={styles.statusStrip} aria-live="polite" data-public-system-status={projection.system_status}>
      <p className={styles.roomTitle}>Live Operations</p>
      <p data-public-system-label>{`System Status: ${systemStatusLabel(projection.system_status)}`}</p>
      <p data-public-updated>Last Updated: {formatPublicTimestamp(projection.generated_at)}</p>
    </section>
  );
}
