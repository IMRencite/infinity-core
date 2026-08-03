import type { WorkspaceAdapter } from "@/lib/infinity/build-factory/types";
import { hashText } from "@/lib/infinity/build-factory/paths";
import { WEBSITE_STATE_DIR } from "./constants";
import type { WebsiteBuildState } from "./types";

const STATE_FILE = `${WEBSITE_STATE_DIR}/build-state.json`;

export async function loadWebsiteBuildState(
  workspace: WorkspaceAdapter,
): Promise<WebsiteBuildState> {
  try {
    const raw = await workspace.readTextFile(STATE_FILE);
    return JSON.parse(raw) as WebsiteBuildState;
  } catch {
    return {
      completedSteps: [],
      routeManifest: [],
      componentManifest: [],
      metadataManifest: {},
      sitemapManifest: { urls: [] },
      fileManifest: [],
      validationReports: {},
    };
  }
}

export async function saveWebsiteBuildState(
  workspace: WorkspaceAdapter,
  state: WebsiteBuildState,
): Promise<void> {
  await workspace.createDirectory(WEBSITE_STATE_DIR);
  await workspace.writeTextFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

export function stepCompleted(state: WebsiteBuildState, capabilityKey: string): boolean {
  return state.completedSteps.includes(capabilityKey);
}

export async function markStepCompleted(
  workspace: WorkspaceAdapter,
  state: WebsiteBuildState,
  capabilityKey: string,
): Promise<WebsiteBuildState> {
  if (!state.completedSteps.includes(capabilityKey)) {
    state.completedSteps.push(capabilityKey);
  }
  await saveWebsiteBuildState(workspace, state);
  return state;
}

export async function refreshFileManifest(
  workspace: WorkspaceAdapter,
  state: WebsiteBuildState,
): Promise<WebsiteBuildState> {
  const files = await workspace.listWorkspaceFiles();
  state.fileManifest = files
    .filter((f) => !f.path.startsWith(".infinity/"))
    .map((f) => ({ path: f.path, hash: f.hash, bytes: f.bytes }));
  await saveWebsiteBuildState(workspace, state);
  return state;
}

export function hashStatePayload(payload: unknown): string {
  return hashText(JSON.stringify(payload));
}
