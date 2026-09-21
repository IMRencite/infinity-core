import { fetchPublicPath, type Gate } from "./validation-grade-live-verify";
import {
  EXPECTED_AUTHORITY_PUBLIC_ROUTES,
  verifyPremiumAuthorityLivePublic,
} from "./premium-authority-successor-live-verify";
import { EXPECTED_DR_PUBLIC_ROUTES } from "./cre-dr-successor-authorization";

function pass(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function titleOf(html: string): string {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function descriptionOf(html: string): string {
  return (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
    ""
  );
}

function canonicalOf(html: string): string {
  return (
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    ""
  );
}

export const NEW_DR_ROUTES = [
  "/resources/cam-costs/",
  "/resources/free-rent/",
  "/resources/rent-escalations/",
  "/resources/gross-vs-net-lease/",
  "/for/tenant-rep-brokers/",
] as const;

export async function verifyDirectResponseSuccessorLivePublic(input: {
  url: string;
  intendedRoutes?: string[];
  artifactId: string;
  experimentId: string;
  candidateId: string;
}) {
  const intended = [...new Set(input.intendedRoutes?.length ? input.intendedRoutes : [...EXPECTED_DR_PUBLIC_ROUTES])];
  const base = await verifyPremiumAuthorityLivePublic({
    ...input,
    intendedRoutes: intended,
  });
  const pages: Record<string, Awaited<ReturnType<typeof fetchPublicPath>>> = {};
  for (const route of intended) {
    const primary = await fetchPublicPath(input.url, route);
    pages[route] = primary.ok ? primary : await fetchPublicPath(input.url, route.endsWith("/") ? route : `${route}/`);
  }
  const home = pages["/"]?.body ?? "";
  const homeText = stripTags(home);
  const npv = pages["/commercial-lease-npv"]?.body ?? "";
  const npvText = stripTags(npv);
  const hub = pages["/resources"]?.body ?? "";
  const hubText = stripTags(hub);

  const homepage = {
    longForm: pass(homeText.split(/\s+/).filter((word) => /[A-Za-z]{3,}/.test(word)).length >= 800),
    problem: pass(/spreadsheet|rebuild|without rebuilding/i.test(homeText)),
    problemCost: pass(/hour|error|rework|cost of/i.test(homeText)),
    whyCurrentFails: pass(/current method|spreadsheet|manual/i.test(homeText) && /fail|break|drift|hidden/i.test(homeText)),
    mechanism: pass(/NPV|cash-flow|discount/i.test(homeText)),
    productVisualization: pass(/pv-product-frame|PRODUCT_UI_FRAME|data-visualization="PRODUCT_UI_FRAME"|LEASE_OPTION_COMPARISON/.test(home)),
    workedExample: pass(/worked example|example lease|NPV @/i.test(homeText)),
    whoFor: pass(/tenant-rep|boutique CRE|who (this is )?for/i.test(homeText)),
    whoNotFor: pass(/who is this not for|not for/i.test(homeText)),
    pricing: pass(/\$290/.test(homeText) && /\$149/.test(homeText)),
    objections: pass(/objection|who is this not for/i.test(homeText)),
    faq: pass(/data-section-type="FAQ"|<h2[^>]*>FAQ/i.test(home)),
    ctaProgression: pass(/Request Pilot Access/.test(home) && /early-access|pricing/i.test(home)),
    authoritySources: pass(/BOMA|NAIOP|CCIM|appraisal|source/i.test(homeText)),
    disclosure: pass(/in validation|early access|pilot|not legal advice|not a finished product/i.test(homeText)),
  };
  const homepageOverall = pass(Object.values(homepage).every((item) => item === "PASS"));

  const npvPage = {
    directAnswer: pass(/What is NPV in a commercial lease/i.test(npvText) || /data-answer-first/.test(npv)),
    formula: pass(/NPV\s*=|sum of discounted|formula/i.test(npvText)),
    workedExample: pass(/worked example|Year 4|period 4|year-five/i.test(npvText)),
    cashFlowTiming: pass(/cash-flow|when cash moves|CAM|escalat/i.test(npvText)),
    discountRate: pass(/discount rate/i.test(npvText)),
    ti: pass(/tenant improvement/i.test(npvText)),
    freeRent: pass(/free rent/i.test(npvText)),
    cam: pass(/CAM/i.test(npvText)),
    escalations: pass(/escalat/i.test(npvText)),
    differentLeaseTerms: pass(/different (lease )?terms|measurement period/i.test(npvText)),
    npvVsTotalCost: pass(/NPV vs total lease cost|undiscounted totals|total lease cost/i.test(npvText)),
    npvVsEffectiveRent: pass(/effective rent/i.test(npvText)),
    limitations: pass(/not automatically|does not capture|limitation|cap rate/i.test(npvText)),
    brokerWorkflow: pass(/broker|client summary|workflow/i.test(npvText)),
    sources: pass(/investopedia|source|BOMA|CCIM/i.test(npvText)),
    visualizations: pass((npv.match(/data-visualization/g) ?? []).length >= 1),
  };
  const npvOverall = pass(Object.values(npvPage).every((item) => item === "PASS"));

  const resourceHub = {
    topicArchitecture: pass(/cluster|topic/i.test(hubText)),
    questionNavigation: pass(/question/i.test(hubText)),
    spokeSummaries: pass(/CAM|free rent|escalat|gross|net/i.test(hubText)),
    visualTopicMap: pass(/topic map|data-visualization/i.test(hub)),
    authoritySources: pass(/source|BOMA|NAIOP|CCIM|appraisal/i.test(hubText)),
    internalLinking: pass(/cam-costs|free-rent|rent-escalations|gross-vs-net/i.test(hub)),
    commercialPathway: pass(/early-access|pricing|Request Pilot/i.test(hub)),
  };
  const hubOverall = pass(Object.values(resourceHub).every((item) => item === "PASS"));

  const newRoutes = Object.fromEntries(
    NEW_DR_ROUTES.map((route) => {
      const html = pages[route]?.body ?? "";
      const text = stripTags(html);
      const title = titleOf(html);
      return [
        route,
        pass(
          Boolean(pages[route]?.ok) &&
            title.length > 8 &&
            descriptionOf(html).length > 20 &&
            canonicalOf(html).length > 0 &&
            text.split(/\s+/).filter((word) => /[A-Za-z]{3,}/.test(word)).length >= 200 &&
            /href=["']\//.test(html),
        ),
      ];
    }),
  ) as Record<(typeof NEW_DR_ROUTES)[number], Gate>;

  const moneyToAuthority = pass(
    /href=["']\/resources/.test(home) &&
      /href=["']\/commercial-lease-npv/.test(home) &&
      /href=["']\/pricing/.test(hub),
  );
  const authorityToConversion = pass(
    /href=["']\/early-access/.test(npv + hub) && /href=["']\/pricing/.test(npv + hub),
  );
  const contextualLinks = pass(/cam-costs|free-rent|rent-escalations/.test(home + npv + hub));
  const questionIdentity = pass(/data-question-id/.test(home + npv + hub));
  const answerChunkIdentity = pass(/data-answer-chunk|data-answer-first/.test(home + npv));
  const ctaIdentity = pass(/data-cta-id|Request Pilot Access/.test(home));

  return {
    ...base,
    homepageDr: { ...homepage, overall: homepageOverall },
    npvPage: { ...npvPage, overall: npvOverall },
    resourceHub: { ...resourceHub, overall: hubOverall },
    newRoutes,
    moneyToAuthority,
    authorityToConversion,
    contextualLinks,
    semanticGaps: base.links.broken + base.links.indexableOrphans,
    instrumentation: {
      ...base.instrumentation,
      questionIdentity: questionIdentity,
      answerChunkIdentity,
      ctaIdentity,
    },
    expectedAuthorityRoutesStillPresent: EXPECTED_AUTHORITY_PUBLIC_ROUTES.every((route) =>
      intended.some((item) => item.replace(/\/$/, "") === route.replace(/\/$/, "")),
    ),
  };
}

export function liveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyDirectResponseSuccessorLivePublic>>,
): boolean {
  return (
    live.homepageHttp === "PASS" &&
    live.allIntendedPages === "PASS" &&
    live.homepageDr.overall === "PASS" &&
    live.npvPage.overall === "PASS" &&
    live.resourceHub.overall === "PASS" &&
    Object.values(live.newRoutes).every((item) => item === "PASS") &&
    live.design.overall === "PASS" &&
    live.geoSeo.geoseoLive === "PASS" &&
    live.links.broken === 0 &&
    live.links.indexableOrphans === 0 &&
    live.semanticGaps === 0 &&
    live.schema.invalid === 0 &&
    !live.schema.fakeRatings &&
    !live.schema.fakeReviews &&
    !live.schema.fakeOffers &&
    live.sitemapHttp === "PASS" &&
    live.robots === "PASS" &&
    live.footer.exact === "PASS" &&
    live.form.form === "PASS" &&
    live.form.successorArtifactLineage === "PASS" &&
    live.protectionResponse === "ABSENT" &&
    live.vercelAuthentication === "DISABLED"
  );
}
