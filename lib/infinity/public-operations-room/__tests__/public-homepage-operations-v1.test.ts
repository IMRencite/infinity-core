import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  constructPublicOperationsProjection,
  idleTruthObservation,
} from "@/lib/infinity/public-operations-projection";
import { emptyCanonicalOccupancy } from "@/lib/infinity/public-operations-projection/occupancy";
import { agentMotion } from "../format";
import {
  evaluatePublicHomepageOperationsGate,
  evaluatePublicOperationsAccessibilityGate,
  evaluatePublicOperationsRoomDOMPrivacyGate,
  evaluatePublicOperationsRoomDataBoundaryGate,
  evaluatePublicOperationsRoomNetworkBoundaryGate,
  evaluatePublicOperationsRoomPrivacyBundle,
  evaluatePublicOperationsRoomTruthGate,
  evaluatePublicOperationsResponsiveGate,
  evaluateSalesTrainingPrivacyGate as evaluatePublicSalesTrainingPrivacyGate,
} from "../gates";
import { evaluateFounderVisualAcceptanceGate, evaluatePublicIdleAgentPresenceGate } from "../visual-gates";
import { evaluateProspectIntelligencePublicPrivacyGate } from "@/lib/infinity/prospect-intelligence/gates";
import { evaluateSalesTrainingPrivacyGate } from "@/lib/infinity/sales-learning/gates";
import {
  FUTURE_IMROS_ROOT_CANDIDATE,
  PUBLIC_OPERATIONS_HOMEPAGE_ROUTE,
  PUBLIC_OPERATIONS_ROOM_POLL_MS,
  PUBLIC_OPERATIONS_ROOM_ROUTE,
} from "../contract";

const ROOM = "components/public/operations-room/live-operations-room.tsx";
const FLOOR = "components/public/operations-room/operations-floor.tsx";
const CSS = "components/public/operations-room/operations-room.module.css";
const EXPERIENCE = "components/public/operations-room/canonical-public-operations-experience.tsx";
const DEEP = "app/public/operations-room/page.tsx";
const API = "app/api/public/operations/route.ts";

describe("Public homepage operations v1", () => {
  it("homepage is the canonical public operations surface", () => {
    expect(FUTURE_IMROS_ROOT_CANDIDATE).toBe("/");
    expect(PUBLIC_OPERATIONS_HOMEPAGE_ROUTE).toBe("/");
    expect(readFileSync(EXPERIENCE, "utf8")).toContain("CanonicalPublicOperationsExperience");
    expect(readFileSync(EXPERIENCE, "utf8")).toContain("LiveOperationsRoom");
    expect(readFileSync(DEEP, "utf8")).toContain("CanonicalPublicOperationsExperience");
    const publicRoot = join(process.cwd(), "..", "imros-public-deploy", "app/page.tsx");
    expect(existsSync(publicRoot)).toBe(true);
    expect(evaluatePublicHomepageOperationsGate().result).toBe("PASS");
  });

  it("homepage polls PublicOperationsProjection and reflects occupancy without refresh", () => {
    const live = readFileSync(ROOM, "utf8");
    expect(live).toContain("PUBLIC_OPERATIONS_ROOM_ENDPOINT");
    expect(live).toContain("cache: \"no-store\"");
    expect(live).toContain("setInterval");
    expect(PUBLIC_OPERATIONS_ROOM_POLL_MS).toBe(8_000);
    expect(readFileSync(API, "utf8")).toContain("force-dynamic");
    expect(readFileSync(API, "utf8")).toContain("revalidate = 0");
    expect(readFileSync(API, "utf8")).toContain("projectPublicOperationsAsync");
    for (const level of ["IDLE", "MONITORING", "ACTIVE"] as const) {
      const occupancy = emptyCanonicalOccupancy("2026-09-16T04:10:00.000Z", level);
      const projection = constructPublicOperationsProjection({ ...idleTruthObservation(), occupancy });
      expect(projection.public_activity_summary).toBe(level);
      expect(agentMotion(projection.public_agents[0]!.public_status) === "working").toBe(level === "ACTIVE");
      expect(agentMotion(projection.public_agents[0]!.public_status) === "scanning").toBe(level === "MONITORING");
      expect(agentMotion(projection.public_agents[0]!.public_status) === "idle").toBe(level === "IDLE");
    }
  });

  it("Prospect Intelligence and Sales remain first-class public rooms", () => {
    const floor = readFileSync(FLOOR, "utf8");
    expect(floor).toContain("PROSPECT_INTELLIGENCE");
    expect(floor).toContain("Sales Floor");
    expect(floor).toContain('data-room-layout="desktop"');
    expect(floor).toContain('data-room-layout="tablet"');
    expect(floor).toContain('data-room-layout="mobile"');
    const occupancy = emptyCanonicalOccupancy("2026-09-16T04:10:00.000Z", "ACTIVE");
    const projection = constructPublicOperationsProjection({ ...idleTruthObservation(), occupancy });
    expect(projection.public_departments.some((row) => row.public_name === "PROSPECT_INTELLIGENCE")).toBe(true);
    expect(projection.public_sales_rooms).toHaveLength(5);
    expect(evaluatePublicOperationsResponsiveGate({
      desktopFloor: true,
      tabletSpatial: true,
      mobileCards: true,
      mobileUsesDesktopFloor: false,
    }).result).toBe("PASS");
  });

  it("privacy, reduced motion, and cache freshness stay intact", () => {
    const occupancy = emptyCanonicalOccupancy("2026-09-16T04:10:00.000Z", "MONITORING");
    const projection = constructPublicOperationsProjection({ ...idleTruthObservation(), occupancy });
    const markup = [
      ...projection.public_departments.map((row) => `${row.public_name} ${row.generic_activity_label}`),
      ...projection.public_sales_rooms.map((row) => `${row.public_name} ${row.generic_activity_label}`),
    ].join("\n");
    expect(evaluatePublicOperationsRoomDataBoundaryGate().result).toBe("PASS");
    expect(evaluatePublicOperationsRoomNetworkBoundaryGate().result).toBe("PASS");
    expect(evaluatePublicOperationsRoomDOMPrivacyGate(markup).result).toBe("PASS");
    expect(evaluateProspectIntelligencePublicPrivacyGate(markup).result).toBe("PASS");
    expect(evaluateSalesTrainingPrivacyGate(markup).result).toBe("PASS");
    expect(evaluatePublicSalesTrainingPrivacyGate(markup).result).toBe("PASS");
    expect(evaluatePublicOperationsRoomPrivacyBundle(projection).every((row) => row.result === "PASS")).toBe(true);
    expect(evaluatePublicIdleAgentPresenceGate().result).toBe("PASS");
    expect(readFileSync(CSS, "utf8")).toContain("prefers-reduced-motion");
    expect(evaluatePublicOperationsAccessibilityGate({
      hasHeadings: true,
      hasTextEquivalents: true,
      reducedMotion: true,
      ariaLive: true,
    }).result).toBe("PASS");
    expect(evaluatePublicOperationsRoomTruthGate({
      renderedActive: String(projection.active_public_agents),
      renderedIdle: String(projection.idle_public_agents),
      projection,
      loadingHasNumericFake: false,
    }).result).toBe("PASS");
    expect(evaluateFounderVisualAcceptanceGate().result).toBe("PENDING_FOUNDER_REVIEW");
    expect(PUBLIC_OPERATIONS_ROOM_ROUTE).toBe("/public/operations-room");
  });
});
