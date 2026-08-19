import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

function node(partial: Partial<OperatorWorkerNode> & Pick<OperatorWorkerNode, "nodeId" | "departmentId">): OperatorWorkerNode {
  return {
    role: "WORK",
    displayRole: "Worker",
    status: "RUNNING",
    task: null,
    displayTask: null,
    provider: null,
    model: null,
    isActive: true,
    isDormant: false,
    motionActive: false,
    ...partial,
  };
}

describe("HQ ambient worker presence", () => {
  it("ACTIVE_WORK when a node is actively moving", () => {
    const presence = deriveRoomPresence(
      [node({ nodeId: "a1", departmentId: "quality_control", motionActive: true, isActive: true })],
      "RUNNING",
    );
    expect(presence.state).toBe("ACTIVE_WORK");
    expect(presence.activeNodes).toHaveLength(1);
  });

  it("PRESENT_IDLE shows only ambient presence without active execution", () => {
    const presence = deriveRoomPresence(
      [node({ nodeId: "i1", departmentId: "product_lab", motionActive: false, isDormant: true, isActive: false, status: "COMPLETE" })],
      "COMPLETE",
    );
    expect(presence.state).toBe("PRESENT_IDLE");
    expect(presence.activeNodes).toHaveLength(0);
    expect(presence.presenceNodes).toHaveLength(1);
    expect(presence.agentsPresent).toBe(1);
    expect(presence.agentsActive).toBe(0);
    expect(presence.agentsIdle).toBe(1);
  });

  it("EMPTY when no worker nodes exist", () => {
    const presence = deriveRoomPresence([], "NOT_STARTED");
    expect(presence.state).toBe("EMPTY");
    expect(presence.presenceNodes).toHaveLength(0);
  });

  it("blocked room is BLOCKED, static, and disables ambient motion", () => {
    const presence = deriveRoomPresence(
      [node({ nodeId: "b1", departmentId: "launch_operations", motionActive: false, isDormant: true, status: "BLOCKED" })],
      "BLOCKED",
    );
    expect(presence.state).toBe("BLOCKED");
    expect(presence.allowAmbientMotion).toBe(false);
    expect(presence.presenceNodes).toHaveLength(1);
    expect(presence.activeNodes).toHaveLength(0);
  });

  it("terminal complete persisted idle workers remain visible without motion", () => {
    const presence = deriveRoomPresence(
      [node({ nodeId: "t1", departmentId: "intelligence_center", motionActive: false, isDormant: true, status: "COMPLETE", isActive: false })],
      "COMPLETE",
      true,
    );
    expect(presence.state).toBe("PRESENT_IDLE");
    expect(presence.presenceNodes).toHaveLength(1);
    expect(presence.allowAmbientMotion).toBe(false);
    expect(presence.activeNodes).toHaveLength(0);
  });

  it("never fabricates presence nodes beyond supplied worker nodes", () => {
    const nodes = [node({ nodeId: "only", departmentId: "product_lab", motionActive: false, isDormant: true })];
    const presence = deriveRoomPresence(nodes, "COMPLETE");
    expect(presence.presenceNodes.length).toBeLessThanOrEqual(5);
    expect(presence.presenceNodes.every((n) => nodes.some((src) => src.nodeId === n.nodeId))).toBe(true);
  });

  it("caps extra idle workers with a real overflow count instead of fabricating orbs", () => {
    const nodes = Array.from({ length: 7 }, (_, i) =>
      node({
        nodeId: `w${i}`,
        departmentId: "product_lab",
        motionActive: false,
        isDormant: true,
        isActive: false,
        status: "COMPLETE",
      }),
    );
    const presence = deriveRoomPresence(nodes, "COMPLETE");
    expect(presence.state).toBe("PRESENT_IDLE");
    expect(presence.presenceNodes).toHaveLength(5);
    expect(presence.overflowWorkerCount).toBe(2);
  });

  it("ACTIVE_WORK keeps motion on active nodes and idle nodes in the presence rail", () => {
    const presence = deriveRoomPresence(
      [
        node({ nodeId: "active", departmentId: "research_department", motionActive: true, isActive: true, status: "RUNNING" }),
        node({ nodeId: "idle", departmentId: "research_department", motionActive: false, isActive: false, isDormant: true, status: "COMPLETE" }),
      ],
      "RUNNING",
    );
    expect(presence.state).toBe("ACTIVE_WORK");
    expect(presence.activeNodes.map((n) => n.nodeId)).toEqual(["active"]);
    expect(presence.presenceNodes.map((n) => n.nodeId)).toEqual(["idle"]);
  });

  it("reduced motion uses static presence class not drift animation", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*hq-room-presence-orb--drift[\s\S]*animation:\s*none/);
  });

  it("visible room presence language uses Agents not Workers", () => {
    const source = readFileSync(join(process.cwd(), "components/dashboard/operator-console/infinity-room/room-presence-track.tsx"), "utf8");
    expect(source).toContain("Agents in room");
    expect(source).toContain("No agents present");
    expect(source).toContain("agents");
    expect(source).not.toMatch(/Workers|No workers present|Idle worker presence/);
  });
});
