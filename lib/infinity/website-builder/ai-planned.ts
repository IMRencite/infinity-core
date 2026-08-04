import type { WorkspaceAdapter } from "@/lib/infinity/build-factory/types";
import type { PersistedBuild } from "@/lib/infinity/build-factory/types";
import type { TranslatedWebsiteModel } from "@/lib/infinity/ai-website-generation/types";
import { WEBSITE_STATE_DIR } from "./constants";
import { runWebsiteCapability } from "./generators";
import { loadWebsiteBuildState, markStepCompleted, refreshFileManifest, stepCompleted } from "./state";

const TRANSLATED_MODEL_PATH = `${WEBSITE_STATE_DIR}/ai-translated-model.json`;

export async function loadTranslatedWebsiteModel(
  workspace: WorkspaceAdapter,
): Promise<TranslatedWebsiteModel | null> {
  try {
    const raw = await workspace.readTextFile(TRANSLATED_MODEL_PATH);
    return JSON.parse(raw) as TranslatedWebsiteModel;
  } catch {
    return null;
  }
}

export async function runAiPlannedPages(
  build: PersistedBuild,
  workspace: WorkspaceAdapter,
): Promise<{ skipped: boolean; file_count: number }> {
  const capabilityKey = "website.generate_ai_planned_pages";
  let state = await loadWebsiteBuildState(workspace);
  if (stepCompleted(state, capabilityKey)) {
    return { skipped: true, file_count: state.fileManifest.length };
  }

  const translated = await loadTranslatedWebsiteModel(workspace);
  if (!translated) {
    throw new Error("Approved translated model required for AI planned pages");
  }

  const spec = { ...build.specification };
  if (spec.website) {
    spec.website = { ...spec.website, pageDefinitions: translated.pageDefinitions, navigation: translated.navigation };
  }

  const buildWithPages = { ...build, specification: spec };
  await runWebsiteCapability("website.generate_pages", buildWithPages, workspace);

  state = await markStepCompleted(workspace, state, capabilityKey);
  state = await refreshFileManifest(workspace, state);
  return { skipped: false, file_count: state.fileManifest.length };
}

export async function runAiPlannedContent(
  build: PersistedBuild,
  workspace: WorkspaceAdapter,
): Promise<{ skipped: boolean; content_records: number }> {
  const capabilityKey = "website.generate_ai_planned_content";
  let state = await loadWebsiteBuildState(workspace);
  if (stepCompleted(state, capabilityKey)) {
    return { skipped: true, content_records: 0 };
  }

  const translated = await loadTranslatedWebsiteModel(workspace);
  if (!translated) {
    throw new Error("Translated model required");
  }

  await workspace.writeTextFile(
    "ai-content-manifest.json",
    `${JSON.stringify({ records: translated.contentRecords, provenance: translated.provenance }, null, 2)}\n`,
  );

  for (const record of translated.contentRecords) {
    const markerPath = `content-drafts/${record.pageKey}-${record.sectionKey}.txt`;
    await workspace.writeTextFile(markerPath, `${record.content}\n`);
  }

  state = await markStepCompleted(workspace, state, capabilityKey);
  await refreshFileManifest(workspace, state);
  return { skipped: false, content_records: translated.contentRecords.length };
}
