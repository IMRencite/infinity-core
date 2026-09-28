import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readAllLocalEnvValues } from "@/lib/infinity/communication-provider/load-local-env";
import { activateVercelTokenForProject, evaluateDeadCredentialShadowing, selectTargetAwareVercelCredential } from "../token-select";

describe("vercel token select", () => {
  it("reads every VERCEL_TOKEN line and activates the first project-capable token", async () => {
    const cwd = join(tmpdir(), `vercel-token-select-${Date.now()}`);
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, ".env.local"), [
      "VERCEL_TOKEN=vcp_workingtokenaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "VERCEL_TOKEN=vcp_brokentokenbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "VERCEL_TEAM_ID=team_example",
      "",
    ].join("\n"));
    expect(readAllLocalEnvValues("VERCEL_TOKEN", cwd)).toHaveLength(2);
    const previous = process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    try {
      const env: NodeJS.Dict<string> = {};
      const result = await activateVercelTokenForProject({
        projectId: "prj_example",
        cwd,
        env,
        fetchImpl: (async (url: string, init?: RequestInit) => {
          const auth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
          if (auth.includes("vcp_workingtoken")) return new Response(JSON.stringify({ id: "prj_example" }), { status: 200 });
          return new Response(JSON.stringify({ error: { code: "forbidden" } }), { status: 403 });
        }) as typeof fetch,
      });
      expect(result.reachable).toBe(true);
      expect(result.selected_index).toBe(0);
      expect(env.VERCEL_TOKEN?.startsWith("vcp_working")).toBe(true);
      expect(JSON.stringify(result)).not.toMatch(/vcp_/);
    } finally {
      if (previous === undefined) delete process.env.INFINITY_LOAD_LOCAL_ENV;
      else process.env.INFINITY_LOAD_LOCAL_ENV = previous;
    }
  });

  it("does not select a last-wins dead token when an earlier token can read the target", async () => {
    const cwd = join(tmpdir(), `vercel-token-lastwins-${Date.now()}`);
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, ".env.local"), [
      "VERCEL_TOKEN=vcp_workingtokenaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "VERCEL_TOKEN=vcp_deadtokenbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "VERCEL_TEAM_ID=team_example",
      "",
    ].join("\n"));
    const previous = process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    try {
      const env: NodeJS.Dict<string> = {};
      const selected = await selectTargetAwareVercelCredential({
        projectId: "prj_target",
        cwd,
        env,
        fetchImpl: (async (_url: string, init?: RequestInit) => {
          const auth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
          if (auth.includes("vcp_workingtoken")) return new Response("{}", { status: 200 });
          return new Response("{}", { status: 403 });
        }) as typeof fetch,
      });
      expect(selected.selected_index).toBe(0);
      expect(selected.dead_shadowing).toBe(false);
      expect(selected.order_dependent).toBe(false);
      expect(evaluateDeadCredentialShadowing({
        last_loaded_index: 1,
        selected_index: selected.selected_index,
        last_loaded_project_ok: false,
      })).toBe("PASS");
    } finally {
      if (previous === undefined) delete process.env.INFINITY_LOAD_LOCAL_ENV;
      else process.env.INFINITY_LOAD_LOCAL_ENV = previous;
    }
  });
});
