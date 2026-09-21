import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { projectOperationsRoom } from "@/lib/infinity/hq-information-architecture/operations-room";
import { assignedWorkerRolesForRoom } from "@/lib/infinity/hq-room-workers/assigned-roles";
import {
  CLIENT_SAFE_BARREL_EXPORT_GATE,
  CLIENT_SAFE_BARRELS,
  HQ_RUNTIME_MODULE_GRAPH_INTEGRITY_GATE,
  SERVER_CLIENT_BOUNDARY_INTEGRITY_GATE,
  clientGraphSummary,
  evaluateClientSafeBarrelExportGate,
  evaluateHQRuntimeModuleGraphIntegrityGate,
  evaluateServerClientBoundaryIntegrityGate,
  extractRuntimeSpecifiers,
  findImportCycles,
  walkRuntimeGraph,
} from "../index";

const ROOT = process.cwd();

describe("ClientSafeBarrelExportGate", () => {
  it("keeps shared barrels from exporting Playwright or Operations server resolvers", () => {
    const gate = evaluateClientSafeBarrelExportGate();
    expect(gate.gate).toBe(CLIENT_SAFE_BARREL_EXPORT_GATE);
    expect(gate.result).toBe("PASS");
    expect(gate.reasons).toEqual([]);
    const ia = readFileSync(join(ROOT, "lib/infinity/hq-information-architecture/index.ts"), "utf8");
    expect(ia).not.toContain("operations-room");
    const rendered = readFileSync(join(ROOT, "lib/infinity/public-venture-design/rendered-layout/index.ts"), "utf8");
    expect(rendered).not.toContain("served-production-browser");
    expect(rendered).not.toContain("served-production-gate");
    expect(CLIENT_SAFE_BARRELS.length).toBeGreaterThanOrEqual(4);
    const identityBarrel = readFileSync(join(ROOT, "lib/infinity/hq-inspection-identity/index.ts"), "utf8");
    expect(identityBarrel).not.toContain("./resolve");
    expect(identityBarrel).not.toContain("canonical-snapshot");
  });
});

describe("HQRuntimeModuleGraphIntegrityGate", () => {
  it("keeps HQ client graphs off resolve.ts, Playwright, and inspection cycles", () => {
    const gate = evaluateHQRuntimeModuleGraphIntegrityGate();
    expect(gate.gate).toBe(HQ_RUNTIME_MODULE_GRAPH_INTEGRITY_GATE);
    expect(gate.result).toBe("PASS");
    expect(gate.cycles).toEqual([]);
    expect(gate.playwrightReach).toBe(0);
    expect(gate.asyncHooksReach).toBe(0);
    expect(gate.serverOnlyReach).toBe(0);
    expect(gate.resolveReach).toBe(0);
    const provider = walkRuntimeGraph([join(ROOT, "components/dashboard/operator-console/hq-inspection-provider.tsx")]);
    expect(provider.files.some((file) => file.replace(/\\/g, "/").endsWith("hq-inspection-identity/resolve.ts"))).toBe(false);
    expect(provider.prohibited).toEqual([]);
    const idle = walkRuntimeGraph([join(ROOT, "components/dashboard/operator-console/hq-idle-shell.tsx")]);
    expect(idle.files.some((file) => /hq-inspection-identity\/resolve\.ts$|served-production-browser\.ts$|inspection-context\.ts$/.test(file.replace(/\\/g, "/")))).toBe(false);
    expect(idle.prohibited).toEqual([]);
    expect(readFileSync(join(ROOT, "components/dashboard/operator-console/hq-idle-shell.tsx"), "utf8")).not.toContain("inspection-context");
  });

  it("Fixture B: client import of server-only projection is a boundary failure", () => {
    expect(extractRuntimeSpecifiers(`import { build } from "./canonical-snapshot";`)).toEqual(["./canonical-snapshot"]);
    const source = readFileSync(join(ROOT, "components/dashboard/operator-console/hq-inspection-provider.tsx"), "utf8");
    expect(source).not.toContain("hq-inspection-identity/resolve");
    expect(source).not.toContain("canonical-snapshot");
  });

  it("Fixture C: circular HQ room projection import fails the module graph", () => {
    const cycles = findImportCycles(
      [
        join(ROOT, "lib/infinity/hq-inspection-identity/index.ts"),
        join(ROOT, "lib/infinity/hq-first-class-room/index.ts"),
      ],
      { boundedToHqRuntime: true },
    );
    expect(cycles).toEqual([]);
    const synthetic = extractRuntimeSpecifiers(`export * from "./registry";\nimport { x } from "./index";`);
    expect(synthetic).toEqual(["./registry", "./index"]);
  });
});

describe("ServerClientBoundaryIntegrityGate", () => {
  it("keeps Client Component graphs off Playwright, async_hooks, and server render QC", () => {
    const gate = evaluateServerClientBoundaryIntegrityGate();
    expect(gate.gate).toBe(SERVER_CLIENT_BOUNDARY_INTEGRITY_GATE);
    expect(gate.result).toBe("PASS");
    expect(gate.reasons).toEqual([]);
    expect(gate.playwrightReach).toBe(0);
    expect(gate.asyncHooksReach).toBe(0);
    const summary = clientGraphSummary();
    expect(summary.playwright).toBe(0);
    expect(summary.asyncHooks).toBe(0);
    const strip = join(ROOT, "components/dashboard/hq-operating-summary-strip.tsx");
    const graph = walkRuntimeGraph([strip]);
    expect(graph.prohibited).toEqual([]);
    expect(graph.files.some((file) => file.replace(/\\/g, "/").endsWith("served-production-browser.ts"))).toBe(false);
    expect(graph.files.some((file) => file.replace(/\\/g, "/").endsWith("operations-room.ts"))).toBe(false);
  });

  it("still lets the server HQ projection resolve the Operations room", () => {
    const projected = projectOperationsRoom();
    expect(projected.department.id).toBe("operations");
    expect(projected.workers.map((node) => node.displayRole)).toEqual(assignedWorkerRolesForRoom("operations"));
  });

  it("treats type-only imports as non-runtime edges", () => {
    expect(extractRuntimeSpecifiers(`import type { Foo } from "./served-production-browser";`)).toEqual([]);
    expect(extractRuntimeSpecifiers(`export * from "./operations-room";`)).toEqual(["./operations-room"]);
  });

  it("does not follow Next.js server action modules from Client Components", () => {
    const command = walkRuntimeGraph([join(ROOT, "components/dashboard/command-panel.tsx")]);
    const runtime = walkRuntimeGraph([join(ROOT, "components/dashboard/mission-runtime-panel.tsx")]);
    expect(command.prohibited).toEqual([]);
    expect(runtime.prohibited).toEqual([]);
    expect(command.files.some((file) => file.replace(/\\/g, "/").endsWith("served-production-browser.ts"))).toBe(false);
    expect(runtime.files.some((file) => file.replace(/\\/g, "/").endsWith("served-production-browser.ts"))).toBe(false);
  });
});
