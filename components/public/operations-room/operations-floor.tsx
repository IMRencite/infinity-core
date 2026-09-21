import type {
  PublicAgentProjection,
  PublicDepartmentProjection,
  PublicSalesRoomProjection,
} from "@/lib/infinity/public-operations-projection/types";
import { DepartmentZone } from "./department-zone";
import { OverheadRoom } from "./overhead-room";
import { SalesRoomZone } from "./sales-room-zone";
import styles from "./operations-room.module.css";

const DEPARTMENT_ORDER: PublicDepartmentProjection["public_name"][] = [
  "OPERATIONS",
  "RESEARCH",
  "GROWTH",
  "VALIDATION",
  "SYSTEMS",
  "FINANCE",
  "PRODUCT",
  "CREATIVE",
  "PROSPECT_INTELLIGENCE",
];

function DepartmentGrid({
  departments,
  agents,
  salesRooms,
  layout,
}: {
  departments: PublicDepartmentProjection[];
  agents: PublicAgentProjection[];
  salesRooms: PublicSalesRoomProjection[];
  layout: "desktop" | "tablet" | "mobile";
}) {
  const salesStatus = salesRooms.some((row) => row.public_status === "ACTIVE")
    ? "ACTIVE"
    : salesRooms.some((row) => row.public_status === "MONITORING")
      ? "MONITORING"
      : "IDLE";
  const salesMotion = salesStatus === "ACTIVE" ? "working" : salesStatus === "MONITORING" ? "scanning" : "idle";
  const salesPresence = salesStatus === "ACTIVE" ? "executing" : salesStatus === "MONITORING" ? "watching" : "ready";
  return (
    <div className={styles.deptGrid} data-public-floor-grid="true" data-building-columns={layout === "desktop" ? "3" : layout === "tablet" ? "2" : "1"}>
      {DEPARTMENT_ORDER.map((id) => {
        const department = departments.find((row) => row.public_name === id);
        if (!department) return null;
        return (
          <DepartmentZone
            key={`${layout}-${id}`}
            department={department}
            agents={agents.filter((agent) => agent.department === id)}
          />
        );
      })}
      <OverheadRoom
        id="SALES"
        name="Sales"
        status={salesStatus}
        activity={salesStatus === "ACTIVE" ? "Executing qualified sales work across operating ventures." : salesStatus === "MONITORING" ? "Monitoring revenue-generation motions across operating ventures." : "Sales operators present. No current execution."}
        motion={salesMotion}
        agentCount={2}
        agents={(
          <>
            <span className={`${styles.node} ${styles[salesMotion === "working" ? "working" : salesMotion === "scanning" ? "scanning" : "idle"]}`} data-public-agent-id={`public-sales-command-${layout}-1`} data-agent-status={salesStatus} data-agent-motion={salesMotion} data-agent-presence={salesPresence}>
              <span className={styles.nodeRing} aria-hidden="true" />
              <span className={styles.nodeArc} aria-hidden="true" />
              <span className={styles.nodeFloor} aria-hidden="true" />
            </span>
            <span className={`${styles.node} ${styles[salesMotion === "working" ? "scanning" : "idle"]}`} data-public-agent-id={`public-sales-command-${layout}-2`} data-agent-status={salesStatus === "ACTIVE" ? "MONITORING" : "IDLE"} data-agent-motion={salesStatus === "ACTIVE" ? "scanning" : "idle"} data-agent-presence={salesStatus === "ACTIVE" ? "watching" : "ready"}>
              <span className={styles.nodeRing} aria-hidden="true" />
              <span className={styles.nodeArc} aria-hidden="true" />
              <span className={styles.nodeFloor} aria-hidden="true" />
            </span>
          </>
        )}
      />
    </div>
  );
}

export function OperationsFloor({
  departments,
  agents,
  salesRooms,
}: {
  departments: PublicDepartmentProjection[];
  agents: PublicAgentProjection[];
  salesRooms: PublicSalesRoomProjection[];
}) {
  return (
    <section
      className={styles.hqBuilding}
      data-public-operations-room="true"
      data-public-operations-building="true"
      data-full-width="true"
      id="live-operations"
      aria-label="Live operations building"
    >
      <h2 className={styles.roomTitle}>Live Operations Building</h2>
      <ul className={styles.stateLegend} aria-label="Room state legend">
        <li data-legend="active"><span className={`${styles.legendSwatch} ${styles.legendActive}`} aria-hidden="true" />ACTIVE</li>
        <li data-legend="monitoring"><span className={`${styles.legendSwatch} ${styles.legendMonitoring}`} aria-hidden="true" />MONITORING</li>
        <li data-legend="idle"><span className={`${styles.legendSwatch} ${styles.legendIdle}`} aria-hidden="true" />IDLE</li>
      </ul>
      <p className={styles.spineCaption}>Command spine</p>
      <div className={styles.flowRail} aria-label="Building activity flow">
        <span>Research</span>
        <span>Validation</span>
        <span>Product</span>
        <span>Growth</span>
        <span>Sales</span>
        <span>Operations</span>
      </div>
      <div className={styles.floorStack} data-room-layout="desktop" data-public-floor="COMMAND" data-building-columns="3">
        <DepartmentGrid departments={departments} agents={agents} salesRooms={salesRooms} layout="desktop" />
      </div>
      <div className={styles.tabletFloor} data-room-layout="tablet" data-public-floor="TABLET">
        <DepartmentGrid departments={departments} agents={agents} salesRooms={salesRooms} layout="tablet" />
      </div>
      <div className={styles.mobileCards} data-room-layout="mobile" data-public-floor="MOBILE">
        <DepartmentGrid departments={departments} agents={agents} salesRooms={salesRooms} layout="mobile" />
      </div>
      <div className={`${styles.floorBand} ${styles.salesFloor}`} id="sales-floor" data-public-floor="SALES" data-public-sales-floor="true">
        <p className={styles.floorLabel}>Sales Floor</p>
        <p className={styles.salesFloorLead}>Five revenue chambers. Public-safe observation only.</p>
        <p className={styles.affiliateCapability} data-affiliate-capability="true">
          Affiliate & Referral capability is present in Partnerships & Channel. Partner identities and payouts are not shown.
        </p>
        <div className={styles.salesGrid}>
          {salesRooms.map((room) => (
            <SalesRoomZone key={room.room_id} room={room} />
          ))}
        </div>
      </div>
    </section>
  );
}
