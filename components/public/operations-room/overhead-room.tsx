import type { ReactNode } from "react";
import styles from "./operations-room.module.css";

const LAYOUTS = ["Operations", "Research", "Growth", "Validation", "Systems", "Finance", "Product", "Creative", "Sales", "Prospect"] as const;

const PURPOSE: Record<string, string> = {
  Operations: "Command",
  Research: "Evidence",
  Growth: "Acquisition",
  Validation: "Quality",
  Systems: "Runtime",
  Finance: "Economics",
  Product: "Product",
  Creative: "Assets",
  Sales: "Revenue",
  Prospect: "Prospects",
  "Prospect Intelligence": "Prospects",
  "Outbound Acquisition": "Outbound",
  "Inbound Conversion": "Inbound",
  "Expansion & Retention": "Retention",
  "Partnerships & Channel": "Channel",
  "Offer & Closing": "Closing",
};

export function OverheadRoom({
  id,
  name,
  status,
  activity,
  motion,
  agentCount,
  agents,
  affiliateZone,
}: {
  id: string;
  name: string;
  status: string;
  activity: string;
  motion: string;
  agentCount: number;
  agents: ReactNode;
  affiliateZone?: boolean;
}) {
  const layout = LAYOUTS.find((row) => name.toLowerCase().includes(row.toLowerCase())) ?? "Operations";
  const motionClass = motion === "building" ? styles.motionBuilding : styles[motion] ?? "";
  return (
    <article
      className={`${styles.room} ${motionClass} ${styles[`layout${layout}`] ?? ""}`}
      data-department-id={id}
      data-hq-room={id === "OPERATIONS" ? "true" : "false"}
      data-department-status={status}
      data-department-motion={motion}
      data-room-composition="overhead"
      data-active-glow={motion === "working" ? "true" : "false"}
      data-agent-prominence="high"
      data-room-presence={motion === "working" ? "executing" : motion === "scanning" || motion === "reviewing" ? "watching" : "ready"}
      data-idle-presence={motion === "working" ? "false" : "true"}
    >
      <header className={styles.roomHeader}>
        <div>
          <p className={styles.zonePurpose}>{PURPOSE[name] ?? "Operations"}</p>
          <h3 className={styles.zoneLabel}>{name}</h3>
          <p className={styles.zoneActivity}>{activity}</p>
        </div>
        <div>
          <p className={styles.zoneStatus}>{status}</p>
          <p className={styles.zoneCount}>{`${agentCount} agents`}</p>
        </div>
      </header>
      <div className={styles.roomInterior} data-room-interior="true">
        <span className={styles.glass} aria-hidden="true" />
        <span className={styles.wall} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
        <span className={styles.floorPlate} data-room-floor="true" aria-hidden="true" />
        <span className={styles.aisle} aria-hidden="true" />
        <span className={styles.workTable} data-work-table="true" data-work-station="true" aria-hidden="true" />
        <span className={styles.console} data-work-station="true" aria-hidden="true" />
        <span className={`${styles.bay} ${styles.bayA}`} data-work-station="true" aria-hidden="true" />
        <span className={`${styles.station} ${styles.stationA}`} data-work-station="true" aria-hidden="true" />
        <span className={`${styles.station} ${styles.stationB}`} data-work-station="true" aria-hidden="true" />
        <span className={styles.monitor} data-work-station="true" aria-hidden="true" />
        <span className={styles.hintA} aria-hidden="true" />
        <span className={styles.hintB} aria-hidden="true" />
        <span className={styles.rail} aria-hidden="true" />
        <span className={styles.path} aria-hidden="true" />
        <span className={styles.orb} aria-hidden="true" />
        <span className={styles.door} aria-hidden="true" />
        <div className={styles.agentField} aria-label={`${name} agents`}>
          {agents}
        </div>
        {affiliateZone ? (
          <p className={styles.affiliateZone} data-affiliate-zone="true">
            Affiliate & Referral
          </p>
        ) : null}
      </div>
    </article>
  );
}
