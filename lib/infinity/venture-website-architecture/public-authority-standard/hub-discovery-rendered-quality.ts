import type { Gate } from "./types";

export const HUB_DISCOVERY_RENDERED_QUALITY_GATE = "HubDiscoveryRenderedQualityGate" as const;
export const HUB_QUESTION_BOARD_LAYOUT_GATE = "HubQuestionBoardLayoutGate" as const;

export type HubQuestionBoardGeometry = {
  viewportWidth?: number;
  containerWidth?: number;
  gridWidth?: number;
  columnCount?: number;
  groupWidths?: number[];
  rowCount?: number;
  lastRowOccupancy?: number;
  lastRowGroupCount?: number;
  roleBandWidth?: number;
  roleBandX?: number;
  roleBandY?: number;
  gridX?: number;
  overflowX?: number;
  groupCount?: number;
  captured?: boolean;
};

export type HubQuestionBoardLayoutInput = {
  html: string;
  css: string;
  desktopColumnCount?: number;
  lastRowGroupCount?: number;
  groupCount?: number;
  geometry?: HubQuestionBoardGeometry;
  requireGeometry?: boolean;
};

function hasHubBoard(html: string): boolean {
  return /data-hub-question-discovery/.test(html);
}

function roleInSameGrid(html: string): boolean {
  const beforeBand = html.split(/pv-discovery-band|data-hub-role-band/)[0] ?? html;
  return /pv-discovery-grid/.test(beforeBand) && /FOR_YOUR_ROLE/.test(beforeBand);
}

function hasRoleBand(html: string, css: string): boolean {
  return (
    /pv-discovery-band/.test(html) ||
    /data-hub-role-band/.test(html) ||
    /grid-column:\s*1\s*\/\s*-1/.test(css)
  );
}

function expectedDesktopColumns(viewportWidth: number): number {
  if (viewportWidth <= 700) return 1;
  if (viewportWidth <= 1100) return 2;
  return 3;
}

export function evaluateHubQuestionBoardLayout(input: HubQuestionBoardLayoutInput): {
  gate: typeof HUB_QUESTION_BOARD_LAYOUT_GATE;
  overall: Gate;
  leftoverSingletonGroup: boolean;
  autoFitSparseColumns: boolean;
  missingGeometry: boolean;
  founderLeftoverPattern: boolean;
  rolePresentation: "FULL_WIDTH_BAND" | "GRID_CELL" | "ABSENT";
  failures: string[];
} {
  const failures: string[] = [];
  const html = input.html;
  const css = input.css;
  const geometry = input.geometry;
  if (!hasHubBoard(html)) {
    return {
      gate: HUB_QUESTION_BOARD_LAYOUT_GATE,
      overall: "PASS",
      leftoverSingletonGroup: false,
      autoFitSparseColumns: false,
      missingGeometry: false,
      founderLeftoverPattern: false,
      rolePresentation: "ABSENT",
      failures,
    };
  }

  const groupMatches = html.match(/data-discovery-group=/g) ?? [];
  const groupCount = geometry?.groupCount ?? input.groupCount ?? groupMatches.length;
  const columnCount = geometry?.columnCount ?? input.desktopColumnCount;
  const lastRow = geometry?.lastRowOccupancy ?? geometry?.lastRowGroupCount ?? input.lastRowGroupCount;
  const roleBand = hasRoleBand(html, css);
  const leftoverFromMarkup = roleInSameGrid(html);
  const leftoverFromGeometry =
    lastRow === 1 && (columnCount ?? 0) >= 4 ||
    (groupCount >= 6 && !roleBand && leftoverFromMarkup);
  const leftoverSingletonGroup = leftoverFromMarkup || leftoverFromGeometry;
  if (leftoverSingletonGroup) failures.push("hub_discovery_leftover_singleton_group");

  const autoFitSparseColumns =
    /pv-discovery-grid[\s\S]{0,220}auto-fit[\s\S]{0,80}minmax\(\s*220px/.test(css) ||
    ((columnCount ?? 0) >= 5 && groupCount >= 6 && !roleBand);
  if (autoFitSparseColumns) failures.push("hub_discovery_autofit_sparse_columns");

  const explicitBalance =
    /pv-discovery-grid[\s\S]{0,240}repeat\(\s*3\s*,/.test(css) ||
    /pv-discovery-grid--balanced/.test(html) ||
    /--pv-discovery-layout:\s*balanced-3/.test(css);
  if (!explicitBalance) failures.push("hub_discovery_missing_balanced_columns");
  if (/FOR_YOUR_ROLE/.test(html) && !roleBand) failures.push("hub_discovery_role_not_full_width_band");

  const missingGeometry =
    Boolean(input.requireGeometry) && geometry?.captured !== true;
  if (missingGeometry) failures.push("hub_discovery_missing_board_geometry");

  const viewport = geometry?.viewportWidth ?? 1280;
  if (geometry?.captured) {
    const expected = expectedDesktopColumns(viewport);
    if (columnCount != null && columnCount > expected && groupCount >= 5) {
      failures.push("hub_discovery_more_columns_than_density");
    }
    if (viewport >= 1280 && columnCount != null && columnCount !== 3 && groupCount >= 5) {
      failures.push("hub_discovery_desktop_not_three_columns");
    }
    if (viewport >= 1024 && viewport < 1100 && columnCount != null && columnCount > 2) {
      failures.push("hub_discovery_tablet_not_reduced");
    }
    if (viewport <= 390 && columnCount != null && columnCount > 1) {
      failures.push("hub_discovery_mobile_not_stacked");
    }
    if ((geometry.overflowX ?? 0) > 1) failures.push("hub_discovery_horizontal_overflow");
    const gridWidth = geometry.gridWidth ?? 0;
    const roleWidth = geometry.roleBandWidth ?? 0;
    if (roleBand && roleWidth > 0 && gridWidth > 0 && Math.abs(roleWidth - gridWidth) / gridWidth > 0.08) {
      failures.push("hub_discovery_role_band_not_aligned");
    }
    if (roleBand && geometry.roleBandX != null && geometry.gridX != null && Math.abs(geometry.roleBandX - geometry.gridX) > 12) {
      failures.push("hub_discovery_role_band_misaligned_x");
    }
    if (lastRow === 1 && (columnCount ?? 0) >= 3 && leftoverFromMarkup) {
      failures.push("hub_discovery_visual_orphan");
    }
  }

  const founderLeftoverPattern = leftoverSingletonGroup || autoFitSparseColumns || leftoverFromMarkup;
  const rolePresentation: "FULL_WIDTH_BAND" | "GRID_CELL" | "ABSENT" = /FOR_YOUR_ROLE/.test(html)
    ? roleBand && !leftoverFromMarkup
      ? "FULL_WIDTH_BAND"
      : "GRID_CELL"
    : "ABSENT";

  return {
    gate: HUB_QUESTION_BOARD_LAYOUT_GATE,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    leftoverSingletonGroup,
    autoFitSparseColumns,
    missingGeometry,
    founderLeftoverPattern,
    rolePresentation,
    failures,
  };
}

export function evaluateHubDiscoveryRenderedQuality(input: HubQuestionBoardLayoutInput) {
  const result = evaluateHubQuestionBoardLayout(input);
  return {
    ...result,
    gate: HUB_DISCOVERY_RENDERED_QUALITY_GATE,
  };
}

export const FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE = {
  html: `<section data-hub-question-discovery="true">
  <h2>Questions this topic answers</h2>
  <p>grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
  <div class="pv-discovery-grid">
    <div data-discovery-group="START_HERE"><h3>Start here</h3><ul class="pv-question-row"><li><a href="/a/">What is NPV in a commercial lease?</a></li></ul></div>
    <div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3><ul class="pv-question-row"><li><a href="/b/">How is commercial lease NPV calculated?</a></li></ul></div>
    <div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3><ul class="pv-question-row"><li><a href="/c/">Why do NPV and total lease cost differ?</a></li></ul></div>
    <div data-discovery-group="COMMON_MISTAKES"><h3>Common mistakes</h3><ul class="pv-question-row"><li><a href="/d/">When is NPV the wrong metric?</a></li></ul></div>
    <div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3><ul class="pv-question-row"><li><a href="/e/">What discount rate belongs in lease NPV?</a></li></ul></div>
    <div data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3><ul class="pv-question-row"><li><a href="/f/">How should you explain lease NPV to a client?</a></li></ul></div>
  </div>
</section>`,
  css: `[data-hub-question-discovery] .pv-discovery-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}`,
  desktopColumnCount: 5,
  lastRowGroupCount: 1,
  groupCount: 6,
  geometry: {
    viewportWidth: 1280,
    containerWidth: 1080,
    gridWidth: 1080,
    columnCount: 5,
    groupWidths: [216, 216, 216, 216, 216, 216],
    rowCount: 2,
    lastRowOccupancy: 1,
    lastRowGroupCount: 1,
    overflowX: 0,
    groupCount: 6,
    captured: true,
  } satisfies HubQuestionBoardGeometry,
} as const;

export const GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE = {
  html: `<section data-hub-question-discovery="true">
  <h2>Questions this topic answers</h2>
  <div class="pv-discovery-grid pv-discovery-grid--balanced">
    <div data-discovery-group="START_HERE"><h3>Start here</h3></div>
    <div data-discovery-group="CALCULATE_IT"><h3>Calculate it</h3></div>
    <div data-discovery-group="COMPARE_OPTIONS"><h3>Compare options</h3></div>
    <div data-discovery-group="COMMON_MISTAKES"><h3>Common mistakes</h3></div>
    <div data-discovery-group="GO_DEEPER"><h3>Go deeper</h3></div>
  </div>
  <div class="pv-discovery-band" data-hub-role-band="true" data-discovery-group="FOR_YOUR_ROLE"><h3>For your role</h3></div>
</section>`,
  css: `[data-hub-question-discovery] .pv-discovery-grid {
  --pv-discovery-layout: balanced-3;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.pv-discovery-grid--balanced { align-items: stretch; }
.pv-discovery-band { display: block; width: 100%; }`,
  desktopColumnCount: 3,
  lastRowGroupCount: 2,
  groupCount: 6,
  geometry: {
    viewportWidth: 1280,
    containerWidth: 1080,
    gridWidth: 1080,
    columnCount: 3,
    groupWidths: [348, 348, 348, 348, 348],
    rowCount: 2,
    lastRowOccupancy: 2,
    lastRowGroupCount: 2,
    roleBandWidth: 1080,
    roleBandX: 100,
    roleBandY: 420,
    gridX: 100,
    overflowX: 0,
    groupCount: 6,
    captured: true,
  } satisfies HubQuestionBoardGeometry,
} as const;
