export const RENDERED_SELECTED_ITEM_STATE_QUALITY_GATE = "RenderedSelectedItemStateQualityGate" as const;
export const SELECTED_ITEM_REQUIRED_VIEWPORTS = [375, 390, 768, 1280] as const;

export type SelectedItemViewportEvidence = {
  route: string;
  viewportWidth: number;
  overflowPx?: number;
  result?: "PASS" | "FAIL";
  selectedVisible?: boolean;
};

export type RenderedSelectedItemStateQualityGateResult = {
  gate: typeof RENDERED_SELECTED_ITEM_STATE_QUALITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  selectedVisuallyDistinct: boolean;
  notColorOnly: boolean;
  accessibleSelectedState: boolean;
  synchronizedWithEditor: boolean;
  singleActiveSelection: boolean;
  renderedEvidencePresent: boolean;
};

export function selectedItemMatchesEditor(selectedId: string | null | undefined, editorId: string | null | undefined): boolean {
  return Boolean(selectedId && editorId && selectedId === editorId);
}

export function renderSelectedScenarioFixture(input: {
  names: string[];
  selectedIndex: number;
}): string {
  const cards = input.names.map((name, index) => {
    const active = index === input.selectedIndex;
    return `<li class="onpv-scenario-item${active ? " onpv-scenario-item--active" : ""}" data-scenario-item="true" data-active="${active ? "true" : "false"}"${active ? ` data-selected-item="${name}" aria-current="true"` : ""}><div class="onpv-scenario-item-head"><h3>${name}</h3>${active ? `<span class="onpv-badge onpv-badge--editing" data-selected-badge="true">Editing</span>` : ""}</div><button class="onpv-btn-secondary" type="button" aria-pressed="${active ? "true" : "false"}">Open / Edit</button></li>`;
  });
  const selected = input.names[input.selectedIndex] ?? "";
  return `<section data-scenario-list="true"><ul class="onpv-scenario-grid" data-selected-item="${selected}">${cards.join("")}</ul><form data-editor-item="${selected}"><h2>Edit ${selected}</h2></form></section>`;
}

export function evaluateRenderedSelectedItemStateQualityGate(input: {
  html: string;
  css?: string;
  selectedId?: string | null;
  editorId?: string | null;
  evidence?: SelectedItemViewportEvidence[] | null;
}): RenderedSelectedItemStateQualityGateResult {
  const html = `${input.html}\n${input.css ?? ""}`;
  const reasons: string[] = [];
  const selectedVisuallyDistinct = /onpv-scenario-item--active|data-active="true"|data-selected-badge/i.test(html);
  const notColorOnly = /data-selected-badge|Editing|Selected/.test(html) && /aria-current|aria-pressed|data-active/i.test(html);
  const accessibleSelectedState = /aria-current|aria-pressed|aria-selected/i.test(html)
    && /data-active="true"|data-active=\{active/i.test(html);
  const synchronizedWithEditor = /data-selected-item|data-editor-item|Edit \$\{?editing\.scenario_name|Edit \{editing\.scenario_name\}/i.test(html)
    && (input.selectedId == null && input.editorId == null
      ? /data-editor-item=\{editing\.scenario_id\}|data-editor-item="|data-selected-item=\{editingId/i.test(html)
      : selectedItemMatchesEditor(input.selectedId, input.editorId));
  const activeCount = [...html.matchAll(/data-active="true"/g)].length;
  const sourceAllowsOne = /editingId === row\.scenario_id|active \? "true"/i.test(html);
  const singleActiveSelection = sourceAllowsOne || activeCount === 1;
  const colorOnly = /border-color:\s*var\(--onpv-accent\)/.test(html)
    && !/onpv-badge--editing|data-selected-badge|background:\s*#e8eef4/i.test(html);
  const identical = /data-scenario-item/.test(html) && !selectedVisuallyDistinct;
  const required = SELECTED_ITEM_REQUIRED_VIEWPORTS;
  const samples = input.evidence ?? [];
  const renderedEvidencePresent = required.every((width) =>
    samples.some((sample) => sample.viewportWidth === width && (sample.selectedVisible ?? true) && (sample.result ?? "PASS") === "PASS"),
  );
  if (!selectedVisuallyDistinct || identical) reasons.push("SELECTED_ITEM_AMBIGUOUS");
  if (!notColorOnly || colorOnly) reasons.push("COLOR_ONLY_SELECTION");
  if (!accessibleSelectedState) reasons.push("SELECTED_STATE_INACCESSIBLE");
  if (!synchronizedWithEditor) reasons.push("SELECTED_EDITOR_MISMATCH");
  if (!singleActiveSelection || activeCount > 1 && !sourceAllowsOne) reasons.push("MULTIPLE_ACTIVE_ITEMS");
  if (!renderedEvidencePresent) reasons.push("MISSING_RENDERED_EVIDENCE");
  return {
    gate: RENDERED_SELECTED_ITEM_STATE_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    selectedVisuallyDistinct,
    notColorOnly,
    accessibleSelectedState,
    synchronizedWithEditor,
    singleActiveSelection,
    renderedEvidencePresent,
  };
}
