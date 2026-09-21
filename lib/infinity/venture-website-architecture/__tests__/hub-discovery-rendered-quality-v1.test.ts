import { describe, expect, it } from "vitest";
import {
  evaluateHubDiscoveryRenderedQuality,
  FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE,
  GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE,
} from "../public-authority-standard/hub-discovery-rendered-quality";
import { renderRepairedHubQuestionDiscovery } from "../hub-question-discovery";
import { HUB_DISCOVERY_LAYOUT_CSS } from "../authority-section-surface-css";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";

describe("Hub discovery rendered quality", () => {
  it("fails the founder leftover For your role column on a 5-wide auto-fit grid", () => {
    const gate = evaluateHubDiscoveryRenderedQuality(FOUNDER_HUB_DISCOVERY_LEFTOVER_ROLE_FIXTURE);
    expect(gate.overall).toBe("FAIL");
    expect(gate.leftoverSingletonGroup).toBe(true);
    expect(gate.autoFitSparseColumns).toBe(true);
    expect(gate.failures).toContain("hub_discovery_leftover_singleton_group");
    expect(gate.failures).toContain("hub_discovery_autofit_sparse_columns");
    expect(gate.failures).toContain("hub_discovery_role_not_full_width_band");
  });

  it("passes a 3-column board with For your role as a full-width band", () => {
    expect(evaluateHubDiscoveryRenderedQuality(GOOD_HUB_DISCOVERY_LAYOUT_FIXTURE).overall).toBe("PASS");
  });

  it("renders commercial-lease-npv discovery without a leftover role column", () => {
    const html = renderRepairedHubQuestionDiscovery("/commercial-lease-npv");
    expect(html).toContain("pv-discovery-grid--balanced");
    expect(html).toContain("pv-discovery-band");
    expect(html).toContain('data-discovery-group="FOR_YOUR_ROLE"');
    const beforeBand = html.split("pv-discovery-band")[0] ?? html;
    expect(beforeBand).not.toContain("FOR_YOUR_ROLE");
    expect(evaluateHubDiscoveryRenderedQuality({ html, css: HUB_DISCOVERY_LAYOUT_CSS }).overall).toBe("PASS");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HubQuestionDiscoveryCoverageGate");
  });
});
