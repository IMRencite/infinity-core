import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HQ_DESKTOP_REGION_ORDER } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import {
  evaluateHQInformationHierarchyGate,
  evaluateHQOperationalRoomsProminenceGate,
  evaluateHQTopInformationHierarchyGate,
  evaluateCardTextContainmentGate,
  evaluateHorizontalOverflowGate,
} from "@/lib/infinity/financial-truth/financial-pulse-gates";
import {
  evaluateHQDuplicateSummaryGate,
  evaluateHQSecondaryStatusLayoutGate,
  evaluateMachineStateReadabilityGate,
  evaluateResponsiveCardLayoutGate,
} from "../secondary-status-gates";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

describe("HQ secondary status layout cleanup v1", () => {
  const consoleUi = read("components/dashboard/operator-console/venture-operator-console.tsx");
  const pulseUi = read("components/dashboard/operator-console/hq-financial-pulse.tsx");
  const pulseSource = read("lib/infinity/financial-truth/financial-pulse.ts");
  const rowUi = read("components/dashboard/operator-console/hq-secondary-status-row.tsx");
  const systemUi = read("components/dashboard/hq-operating-summary-strip.tsx");
  const mailboxUi = read("components/dashboard/operator-console/hq-mailbox-observer-panel.tsx");
  const css = read("app/globals.css");
  const liveHook = read("components/dashboard/operator-console/use-hq-live-projection.ts");
  const proof = read("lib/infinity/operator-console/local-hq-proof.ts");
  const pulseIdx = consoleUi.indexOf("<HqFinancialPulse");
  const commandIdx = consoleUi.indexOf('data-hq-region="command"');
  const statusIdx = consoleUi.indexOf("<HqSecondaryStatusRow");
  const roomsIdx = consoleUi.indexOf("<HqSpatialFloor");
  const truthIdx = consoleUi.indexOf('data-hq-region="financial-truth"');
  const rowCss = css.slice(css.indexOf(".hq-secondary-status-row {"), css.indexOf(".hq-room-shell {"));

  it("preserves pulse then Command, then the 50/50 secondary row, then the floor", () => {
    expect(pulseIdx).toBeGreaterThan(-1);
    expect(pulseIdx).toBeLessThan(commandIdx);
    expect(statusIdx).toBeGreaterThan(commandIdx);
    expect(statusIdx).toBeLessThan(roomsIdx);
    expect(roomsIdx).toBeLessThan(truthIdx);
    expect(consoleUi).not.toContain("<PortfolioExecutiveStrip");
    expect(evaluateHQInformationHierarchyGate({ homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER] }).result).toBe("PASS");
    expect(evaluateHQTopInformationHierarchyGate({ homeSurfaceOrder: [...HQ_DESKTOP_REGION_ORDER] }).result).toBe("PASS");
    expect(evaluateHQOperationalRoomsProminenceGate({
      commandBeforeRooms: commandIdx < roomsIdx,
      roomsBeforeFullTreasury: roomsIdx < truthIdx,
      fullTreasuryBetweenCommandAndRooms: commandIdx < truthIdx && truthIdx < roomsIdx,
      pulseCompact: pulseUi.includes("hq-financial-pulse") && !pulseUi.includes("hq-financial-truth__layers"),
      pulseMateriallyBuriesRooms: false,
    }).result).toBe("PASS");
  });

  it("renders System Status and Mailbox Observer as one desktop 50/50 row", () => {
    expect(rowUi).toContain('data-hq-region="secondary-status"');
    expect(rowUi).toContain("<HqOperatingSummaryStrip");
    expect(rowUi).toContain("<HqMailboxObserverPanel");
    expect(systemUi).toContain("System Status");
    expect(systemUi).toContain("System State");
    expect(systemUi).toContain("Interactive Mission");
    expect(systemUi).toContain("Operational State");
    expect(systemUi).toContain("Operating Ventures");
    expect(systemUi).toContain("Validation");
    expect(systemUi).toContain("Opportunities");
    expect(systemUi).toContain("Next Cycle");
    expect(mailboxUi).toContain("Mailbox Observer");
    expect(mailboxUi).toContain("Last Observation");
    expect(mailboxUi).toContain("Last Inbound");
    expect(mailboxUi).toContain("Last Error");
    expect(mailboxUi).not.toContain("<Link");
    expect(systemUi).not.toContain("<Link");
    expect(rowCss).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
    expect(rowCss).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(evaluateHQSecondaryStatusLayoutGate({
      rowPresent: consoleUi.includes("<HqSecondaryStatusRow") && rowUi.includes("hq-secondary-status-row"),
      systemPanelPresent: systemUi.includes('data-hq-region="compact-operating-summary"'),
      mailboxPanelPresent: mailboxUi.includes('data-hq-region="mailbox-observer"'),
      desktopSplit: rowCss.includes("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)"),
      mobileStacks: rowCss.includes("@media (max-width: 720px)") && rowCss.includes("grid-template-columns: minmax(0, 1fr)"),
      afterCommand: commandIdx < statusIdx,
      beforeRooms: statusIdx < roomsIdx,
    }).result).toBe("PASS");
    expect(evaluateResponsiveCardLayoutGate({
      desktopSplit: rowCss.includes("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)"),
      mobileStacks: rowCss.includes("@media (max-width: 720px)"),
      overflowHidden: rowCss.includes("overflow: hidden") && rowCss.includes("text-overflow: ellipsis"),
    }).result).toBe("PASS");
  });

  it("removes the legacy HQ profit / companies / ventures / top-venture summary", () => {
    expect(consoleUi).not.toContain("Profit Generated");
    expect(consoleUi).not.toContain("PROFIT GENERATED");
    expect(consoleUi).not.toContain("Companies Built");
    expect(consoleUi).not.toContain("COMPANIES BUILT");
    expect(consoleUi).not.toContain("<PortfolioExecutiveStrip");
    expect(pulseSource).toContain("Contribution");
    expect(pulseSource).toContain("Top Venture");
    expect(pulseSource).not.toContain("Profit Generated");
    expect(evaluateHQDuplicateSummaryGate({
      legacyProfitGeneratedOnHq: consoleUi.includes("<PortfolioExecutiveStrip") || consoleUi.includes("Profit Generated"),
      legacyCompaniesBuiltOnHq: consoleUi.includes("Companies Built") && consoleUi.includes("<PortfolioExecutiveStrip"),
      legacyOperatingVenturesOnHq: consoleUi.includes("<PortfolioExecutiveStrip"),
      legacyTopVentureOnHq: consoleUi.includes("<PortfolioExecutiveStrip"),
      executivePulsePresent: consoleUi.includes("<HqFinancialPulse") && pulseSource.includes("Top Venture"),
    }).result).toBe("PASS");
  });

  it("keeps canonical live state and contains long machine values", () => {
    expect(rowUi).not.toContain("setInterval");
    expect(rowUi).not.toContain("fetch(");
    expect(mailboxUi).not.toContain("setInterval");
    expect(mailboxUi).not.toContain("fetch(");
    expect(systemUi).not.toContain("setInterval");
    expect(consoleUi).toContain("useHqLiveProjection");
    expect(liveHook).toContain("EventSource");
    expect(mailboxUi).toContain("title={value}");
    expect(systemUi).toContain("title={value}");
    expect(evaluateCardTextContainmentGate({
      overflowHidden: rowCss.includes("overflow: hidden") && rowCss.includes("text-overflow: ellipsis"),
      ellipsis: rowCss.includes("text-overflow: ellipsis"),
      noTimestampWrap: !mailboxUi.includes("toISOString") && mailboxUi.includes("white-space: nowrap") === false,
    }).result).toBe("PASS");
    expect(evaluateHorizontalOverflowGate({
      pageOverflowHidden: consoleUi.includes("overflow-x-hidden"),
      pulseNoForcedScroll: !rowCss.includes("overflow-x: auto") && !rowCss.includes("overflow-x: scroll"),
    }).result).toBe("PASS");
    expect(evaluateMachineStateReadabilityGate({
      longValuesContained: rowCss.includes("text-overflow: ellipsis") && mailboxUi.includes("title={value}"),
      noRawErrorDump: !mailboxUi.includes("JSON.stringify") && mailboxUi.includes("Last Error"),
      noTimestampWrap: mailboxUi.includes("compactTime") && rowCss.includes("white-space: nowrap"),
    }).result).toBe("PASS");
  });

  it("forces an already-open founder tab to pick up the new HQ chrome", () => {
    expect(proof).toContain("hq-secondary-status-readable-v1");
    expect(proof).toContain("consumeHqDevClientBuildReload");
    expect(consoleUi).toContain("consumeHqDevClientBuildReload");
    expect(consoleUi).toContain("window.location.reload");
    expect(consoleUi).toContain("key={process.env.NODE_ENV !== \"production\" ? hqDevClientBuildId()");
    expect(read("next.config.ts")).toContain('distDir: process.env.NEXT_DIST_DIR || ".next"');
  });
});
