import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { agentMotion, agentPresence, roomPresence, salesRoomMotion } from "../format";
import { evaluatePublicAgentAnimationTruthGate } from "../gates";
import { evaluatePublicIdleAgentPresenceGate } from "../visual-gates";

const CSS = "components/public/operations-room/operations-room.module.css";
const NODE = "components/public/operations-room/public-agent-node.tsx";
const LIVE = "components/public/operations-room/live-operations-room.tsx";

describe("IMROS public idle agent presence", () => {
  it("idle agents show subtle presence motion and stay distinct from active", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain("idlePresence");
    expect(css).toContain("idleScan");
    expect(css).toContain("idleArc");
    expect(css).toContain("idleReflect");
    expect(css).toContain("translate(2px");
    expect(evaluatePublicIdleAgentPresenceGate().result).toBe("PASS");
    const idleRule = css.match(/\.idle \.node,\s*\.node\.idle \{[\s\S]*?\}/)?.[0] ?? "";
    expect(idleRule).toContain("idlePresence");
    expect(idleRule).not.toMatch(/patrol|travel/);
  });

  it("idle agents do not trigger active work orb motion", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain(".working .orb { animation: travel");
    expect(css).not.toMatch(/\.idle \.orb[^{]*\{[^}]*travel/);
    expect(css).toContain(".idle .orb");
  });

  it("monitoring looks different from idle, and active looks different from both", () => {
    expect(agentMotion("IDLE")).toBe("idle");
    expect(agentMotion("ACTIVE")).toBe("working");
    expect(agentPresence("IDLE")).toBe("ready");
    expect(agentPresence("MONITORING")).toBe("watching");
    expect(agentPresence("ACTIVE")).toBe("executing");
    expect(salesRoomMotion("PRESENT_IDLE")).toBe("idle");
    expect(salesRoomMotion("MONITORING")).toBe("scanning");
    expect(salesRoomMotion("ACTIVE")).toBe("working");
    expect(roomPresence("idle")).toBe("ready");
    expect(roomPresence("scanning")).toBe("watching");
    expect(roomPresence("working")).toBe("executing");
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain("monitorSpin");
    expect(css).toContain("patrol");
    expect(css.indexOf("idlePresence")).not.toBe(css.indexOf("patrol"));
  });

  it("room state transition updates motion without refresh", () => {
    expect(evaluatePublicAgentAnimationTruthGate({ agentStatus: "IDLE", motion: "idle" }).result).toBe("PASS");
    expect(evaluatePublicAgentAnimationTruthGate({ agentStatus: "ACTIVE", motion: "working" }).result).toBe("PASS");
    expect(evaluatePublicAgentAnimationTruthGate({ agentStatus: "IDLE", motion: "working" }).result).toBe("FAIL");
    expect(readFileSync(LIVE, "utf8")).toContain("setInterval");
    expect(readFileSync(NODE, "utf8")).toContain("agentMotion(agent.public_status)");
    expect(readFileSync(NODE, "utf8")).toContain("agentPresence(agent.public_status)");
    expect(agentPresence("IDLE")).not.toBe(agentPresence("ACTIVE"));
  });

  it("reduced motion disables positional animation and idle never fakes ACTIVE", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*\.idle \.node[\s\S]*animation: none/);
    expect(css).not.toContain(".idle .node.working");
    expect(readFileSync(NODE, "utf8")).toContain('data-agent-presence={presence}');
    expect(agentMotion("IDLE")).not.toBe("working");
  });
});
