import { HQ_OPERATIONS_ROUTE } from "@/lib/infinity/hq-information-architecture/contract";
import {
  HQ_KNOWN_APP_ROUTES,
  HQ_NAVIGATION_INTEGRITY_GATE,
  HQ_PRIMARY_NAV_ITEMS,
  REDUNDANT_NAVIGATION_GATE,
  RENDERED_HQ_CONSOLE_QUALITY_GATE,
  hqNavReactKey,
  type HqPrimaryNavItem,
} from "./items";
import { activeHqNavItems } from "./active";

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function evaluateHQNavigationIntegrityGate(input: {
  items?: HqPrimaryNavItem[];
  pathname?: string;
} = {}): NamedGateResult {
  const items = input.items ?? HQ_PRIMARY_NAV_ITEMS;
  const reasons: string[] = [];
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) reasons.push("DUPLICATE_SEMANTIC_ID");
  const keys = items.map(hqNavReactKey);
  if (new Set(keys).size !== keys.length) reasons.push("DUPLICATE_REACT_KEY");
  if (items.some((item) => !item.id.trim())) reasons.push("SEMANTIC_ID_MISSING");
  if (items.some((item) => !item.label.trim())) reasons.push("LABEL_MISSING");
  const visible = items.filter((item) => item.visibility === "visible");
  const hrefs = visible.map((item) => item.href).filter((href): href is string => Boolean(href));
  if (new Set(hrefs).size !== hrefs.length) reasons.push("ACCIDENTAL_DUPLICATE_HREF");
  for (const item of visible) {
    if (!item.href) {
      reasons.push(`VISIBLE_ITEM_MISSING_HREF:${item.id}`);
      continue;
    }
    if (item.href === "#" || item.href === "") reasons.push(`DEAD_ROUTE:${item.id}`);
    const known = (HQ_KNOWN_APP_ROUTES as readonly string[]).includes(item.href);
    if (!known) reasons.push(`UNKNOWN_ROUTE:${item.id}:${item.href}`);
  }
  const purposes = visible.map((item) => item.purpose);
  if (new Set(purposes).size !== purposes.length) reasons.push("AMBIGUOUS_PRIMARY_NAV_PURPOSE");
  if (input.pathname) {
    const active = activeHqNavItems(input.pathname, items);
    if (active.length > 1) reasons.push(`MULTIPLE_ACTIVE:${active.map((item) => item.id).join(",")}`);
  }
  return {
    gate: HQ_NAVIGATION_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateRedundantNavigationGate(input: {
  statusStripHasOperationsLink: boolean;
  operationsRoomPresent: boolean;
  leftNavOperationsPresent: boolean;
  operationsRoomHref: string;
  leftNavOperationsHref: string;
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.statusStripHasOperationsLink) reasons.push("STATUS_STRIP_DUPLICATES_OPERATIONS");
  if (!input.operationsRoomPresent) reasons.push("OPERATIONS_ROOM_MISSING");
  if (!input.leftNavOperationsPresent) reasons.push("LEFT_NAV_OPERATIONS_MISSING");
  if (input.operationsRoomHref !== HQ_OPERATIONS_ROUTE) reasons.push("OPERATIONS_ROOM_HREF_INVALID");
  if (input.leftNavOperationsHref !== HQ_OPERATIONS_ROUTE) reasons.push("LEFT_NAV_OPERATIONS_HREF_INVALID");
  return {
    gate: REDUNDANT_NAVIGATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length === 0 ? ["ROOM_PLUS_LEFT_NAV"] : reasons,
  };
}

const APP_CONSOLE_ERROR = /Encountered two children with the same key|Hydration failed|Text content does not match|Uncaught|Cannot update a component|Invalid hook call|HQ navigation/i;
const EXTENSION_NOISE = /chrome-extension:|moz-extension:|safari-extension:/i;

export function evaluateRenderedHQConsoleQualityGate(input: {
  consoleLines: string[];
}): NamedGateResult {
  const reasons: string[] = [];
  for (const line of input.consoleLines) {
    if (EXTENSION_NOISE.test(line) && !APP_CONSOLE_ERROR.test(line)) continue;
    if (APP_CONSOLE_ERROR.test(line)) reasons.push(line.slice(0, 180));
  }
  return {
    gate: RENDERED_HQ_CONSOLE_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
