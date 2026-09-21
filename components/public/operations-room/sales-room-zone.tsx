import type { PublicSalesRoomProjection } from "@/lib/infinity/public-operations-projection/types";
import { salesRoomMotion } from "@/lib/infinity/public-operations-room/format";
import { OverheadRoom } from "./overhead-room";
import styles from "./operations-room.module.css";

export function SalesRoomZone({ room }: { room: PublicSalesRoomProjection }) {
  const motion = salesRoomMotion(room.public_status);
  const active = room.public_status === "ACTIVE";
  const monitoring = room.public_status === "MONITORING";
  const firstMotion = active ? "working" : monitoring ? "scanning" : "idle";
  const firstStatus = active ? "ACTIVE" : "IDLE";
  return (
    <div data-sales-room-id={room.room_id}>
      <OverheadRoom
        id={room.room_id}
        name={room.public_name}
        status={room.public_status}
        activity={room.generic_activity_label}
        motion={motion}
        agentCount={2}
        affiliateZone={room.room_id === "PARTNERSHIPS_CHANNEL"}
        agents={(
          <>
            <span className={`${styles.node} ${styles[firstMotion]}`} data-public-agent-id={`public-sales-${room.room_id}-1`} data-agent-status={firstStatus} data-agent-motion={firstMotion} data-agent-presence={active ? "executing" : monitoring ? "watching" : "ready"}>
              <span className={styles.nodeRing} aria-hidden="true" />
              <span className={styles.nodeArc} aria-hidden="true" />
              <span className={styles.nodeFloor} aria-hidden="true" />
              <span className={styles.srOnly}>{`${room.public_name} operator ${firstStatus}`}</span>
            </span>
            <span className={`${styles.node} ${styles.idle}`} data-public-agent-id={`public-sales-${room.room_id}-2`} data-agent-status="IDLE" data-agent-motion="idle" data-agent-presence="ready">
              <span className={styles.nodeRing} aria-hidden="true" />
              <span className={styles.nodeArc} aria-hidden="true" />
              <span className={styles.nodeFloor} aria-hidden="true" />
              <span className={styles.srOnly}>{`${room.public_name} operator IDLE`}</span>
            </span>
          </>
        )}
      />
    </div>
  );
}
