"use client";

import { useEffect, useState } from "react";
import type { PublicOperationsProjection } from "@/lib/infinity/public-operations-projection/types";
import { PUBLIC_OPERATIONS_PROJECTION } from "@/lib/infinity/public-operations-projection/types";
import { PUBLIC_OPERATIONS_ROOM_ENDPOINT, PUBLIC_OPERATIONS_ROOM_POLL_MS } from "@/lib/infinity/public-operations-room/contract";
import { HowInfinityOperates } from "./how-infinity-operates";
import { ImrBrandMark } from "./imr-brand-mark";
import { OperationsFloor } from "./operations-floor";
import { OperationsHeader } from "./operations-header";
import { PublicCommandRail } from "./public-command-rail";
import { PublicDegradedState } from "./public-degraded-state";
import { PublicOperationsFooter } from "./public-operations-footer";
import { PublicStatsStrip } from "./public-stats-strip";
import { PublicSystemStatus } from "./public-system-status";
import { PublicVentureGrid } from "./public-venture-grid";
import styles from "./operations-room.module.css";

function isPublicProjection(value: unknown): value is PublicOperationsProjection {
  if (!value || typeof value !== "object") return false;
  const row = value as { contract?: string };
  return row.contract === PUBLIC_OPERATIONS_PROJECTION;
}

export function LiveOperationsRoom() {
  const [projection, setProjection] = useState<PublicOperationsProjection | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const response = await fetch(PUBLIC_OPERATIONS_ROOM_ENDPOINT, { credentials: "omit", cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setUnavailable(true);
          return;
        }
        const json: unknown = await response.json();
        if (!cancelled && isPublicProjection(json)) {
          setProjection(json);
          setUnavailable(json.system_status === "TEMPORARILY_UNAVAILABLE");
        } else if (!cancelled) {
          setUnavailable(true);
        }
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    };
    void pull();
    const timer = window.setInterval(pull, PUBLIC_OPERATIONS_ROOM_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={styles.page} data-imros-operations-room="true" data-hq-grid="true" data-full-width="true">
      <ImrBrandMark />
      <div className={styles.shell}>
        <div className={styles.heroCopy}>
          <OperationsHeader />
        </div>
        {!projection && !unavailable ? (
          <section className={styles.statusStrip} data-public-loading="true">
            <p className={styles.roomTitle}>Live Operations</p>
            <p>Loading public operations…</p>
          </section>
        ) : null}
        {unavailable && !projection ? <PublicDegradedState /> : null}
        {projection ? (
          <>
            <div className={`${styles.hud} ${styles.commandRail}`}>
              <PublicSystemStatus projection={projection} />
              <PublicStatsStrip projection={projection} />
            </div>
            {projection.system_status === "TEMPORARILY_UNAVAILABLE" ? <PublicDegradedState /> : null}
            <div className={styles.hqDeck}>
              <OperationsFloor
                departments={projection.public_departments}
                agents={projection.public_agents}
                salesRooms={projection.public_sales_rooms}
              />
              <PublicCommandRail
                departments={projection.public_departments}
                ventures={projection.public_ventures}
              />
            </div>
            <PublicVentureGrid ventures={projection.public_ventures} />
          </>
        ) : null}
        <HowInfinityOperates />
        <PublicOperationsFooter />
      </div>
    </div>
  );
}
