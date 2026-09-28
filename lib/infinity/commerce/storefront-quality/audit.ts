import { composeClubThrottleStorefrontFiles } from "../club-throttle-storefront-compose";
import { evaluateCustomerCopyGate } from "./customer-copy-gate";

export type RouteAudit = {
  path: string;
  classes: Array<"COMPLETE" | "THIN" | "PLACEHOLDER" | "INTERNAL_LANGUAGE_LEAK" | "MISSING_REQUIRED_MODULES" | "MISSING_VISUALS" | "MISSING_FACTS">;
};

const LEAKS = ["canary", "after the canary", "founder-approved", "internal operations", "no live storefront checkout yet"];

export function auditClubThrottlePublicRoutes(): { routes: RouteAudit[]; thin: number; placeholder: number; leaks: number; infinity_top: number } {
  const composed = composeClubThrottleStorefrontFiles();
  const pages = composed.files.filter((file) => file.path.endsWith("page.tsx") || file.path.endsWith("header.tsx") || file.path.endsWith("footer.tsx") || file.path.endsWith("layout.tsx"));
  const header = pages.find((file) => file.path.endsWith("header.tsx"))?.content ?? "";
  const layout = pages.find((file) => file.path.endsWith("layout.tsx"))?.content ?? "";
  const footer = pages.find((file) => file.path.endsWith("footer.tsx"))?.content ?? "";
  const infinity_top = /infinity os venture/i.test(`${header}\n${layout}`) && !/infinity os venture/i.test(header) ? 0 : /infinity os venture/i.test(header) ? 1 : 0;
  const routes: RouteAudit[] = pages
    .filter((file) => file.path.includes("/page.tsx") || file.path === "app/page.tsx")
    .map((file) => {
      const classes: RouteAudit["classes"] = [];
      const words = file.content.split(/\s+/).length;
      const hasImg = file.content.includes("<img") || file.content.includes("hero");
      const utility = /products\/page|sitemap|search\/page|cart\/page|blog\/page|t-shirts\/page/.test(file.path);
      if (!utility && words < 80) classes.push("THIN");
      if (/will land here|coming soon|lorem/i.test(file.content)) classes.push("PLACEHOLDER");
      if (LEAKS.some((leak) => file.content.toLowerCase().includes(leak)) || evaluateCustomerCopyGate(file.content).result === "FAIL") classes.push("INTERNAL_LANGUAGE_LEAK");
      if (!hasImg && !file.path.includes("privacy") && !file.path.includes("terms") && !file.path.includes("sitemap") && !file.path.includes("cart") && !file.path.includes("search") && !file.path.includes("products/page")) {
        classes.push("MISSING_VISUALS");
      }
      if (file.path.includes("club-throttle-core-tee") && !file.content.includes("size-guide")) classes.push("MISSING_FACTS");
      if (classes.length === 0) classes.push("COMPLETE");
      return { path: file.path, classes };
    });
  return {
    routes,
    thin: routes.filter((row) => row.classes.includes("THIN")).length,
    placeholder: routes.filter((row) => row.classes.includes("PLACEHOLDER")).length,
    leaks: routes.filter((row) => row.classes.includes("INTERNAL_LANGUAGE_LEAK")).length + infinity_top,
    infinity_top,
  };
}

export function knownBadStorefrontFixtures() {
  return {
    collections: { copy: "Collections\nMidnight, club, and road collections will land here after the canary.", words: 12 },
    contact: { copy: "Contact\nOperations: An Infinity OS Venture | By IMR. No live storefront checkout yet.", words: 14 },
    about: { copy: "About\nClub Throttle is an existing approved brand. The mark is founder-approved.", words: 14 },
    header_relationship: { copy: "AN INFINITY OS VENTURE | BY IMR\nClub Throttle", placement: "header" },
  };
}
