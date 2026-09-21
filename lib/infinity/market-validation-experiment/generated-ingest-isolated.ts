import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PUBLIC_INGEST_ROUTE_FILE } from "./ingest";

export async function executeGeneratedIngestRoute(input: {
  files: Array<{ path: string; content: string }>;
  experimentId: string;
  body: unknown;
}): Promise<{ status: number; json: Record<string, unknown> }> {
  const route = input.files.find((file) => file.path === PUBLIC_INGEST_ROUTE_FILE);
  if (!route) {
    return { status: 500, json: { error: "missing_generated_ingest_route" } };
  }
  const dir = await mkdtemp(join(tmpdir(), "infinity-generated-ingest-"));
  const filePath = join(dir, "route.ts");
  await writeFile(filePath, route.content, "utf8");
  const mod = (await import(pathToFileURL(filePath).href)) as {
    POST: (request: Request, context: { params: Promise<{ experimentId: string }> }) => Promise<Response>;
  };
  const response = await mod.POST(
    new Request("https://validation.example/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input.body),
    }),
    { params: Promise.resolve({ experimentId: input.experimentId }) },
  );
  return {
    status: response.status,
    json: (await response.json()) as Record<string, unknown>,
  };
}
