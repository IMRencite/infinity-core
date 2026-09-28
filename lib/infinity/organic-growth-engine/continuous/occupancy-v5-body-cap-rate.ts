/**
 * Customer-facing cap rate article — V5 from-zero body (no v4 depthPad / rubric language).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_CAP_RATE_BUILDING_TOPIC: PageTopicBoundary = {
  page_id: "/blog/valuation/how-is-cap-rate-calculated-for-a-building/",
  venture_id: "occupancynpv",
  primary_topic: "cap rate calculation for commercial buildings",
  primary_reader_job: "Calculate and interpret cap rate using NOI and price or value without confusing tenant cash flow.",
  must_cover: ["NOI", "price", "going-in yield", "stabilized NOI", "indicated value", "occupancy cost distinction"],
  allowed_supporting: ["trailing NOI", "financing context link", "lease compare link"],
  out_of_scope_for_page: ["bike night", "tenant shirt", "group ride", "detailed CAM reconciliation worksheet"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyCapRateV5Body() {
  const answer =
    "Cap rate equals net operating income divided by property value or purchase price. It is a property-level yield, not a tenant occupancy-cost number. Name the NOI, name the denominator, and keep trailing and stabilized income separate before you quote a percentage.";

  const headings = [
    "Cap rate in one line",
    "What net operating income means here",
    "Trailing NOI versus stabilized NOI",
    "Price, value, and indicated value",
    "A worked example you can reuse",
    "When cap rate rises or falls",
    "Why this is not tenant occupancy-cost NPV",
    "What to write down before a meeting",
    "Common mistakes that skew the math",
    "Partial occupancy and transition years",
    "Dark stores and unusual assets",
    "How financing relates without replacing cap rate",
    "When cap rate alone is not enough",
    "How brokers and buyers use the same identity",
    "What tenants should take from this page",
    "Sources worth citing",
    "Related reading on OccupancyNPV",
    "Limitations",
    "Questions people ask",
  ];

  const body = paragraphs([
    "Cap rate is net operating income divided by value or price. Investors quote it as a going-in yield on a building’s income stream. The math is simple; the inputs are not. If the numerator is the wrong year of income, or the denominator is a wish rather than a cleared price, the percentage looks precise and misleads everyone in the room.",
    "Net operating income is income from operations after operating expenses and before debt service, capital expenditures you treat separately, and income taxes. It is not rent a tenant pays. It is not CAM a tenant reimburses. It is the building’s operating story told in one annual number, or in a pro forma you label clearly as stabilized.",
    "Trailing NOI uses recent actuals, often the last twelve months. Stabilized NOI reflects normalized occupancy, market rents, and recurring expenses once the asset is operating as intended. A lease-up year can make trailing NOI tiny while stabilized NOI shows what the asset should earn. Using trailing income to price a stabilized asset—or the reverse—is one of the fastest ways to argue about the wrong cap rate.",
    "Price is what someone offers to pay today. Indicated value is what the cap-rate identity implies once you accept a NOI and a yield. They are related but not identical until a deal closes. A broker might say “six and a half on stabilized NOI” while the buyer’s model still uses trailing income. Write which NOI you mean on the same line as the percentage.",
    "Suppose stabilized NOI is $120,000 and you are testing a 6% going-in cap rate. Indicated value is $120,000 divided by 0.06, which is $2,000,000. At a 7% yield on the same NOI, indicated value is about $1,714,286. The NOI did not change; the market’s required yield did. That is how rate moves reprice the same income stream.",
    "When required yields rise, indicated value falls if NOI is held constant. When yields fall, indicated value rises. Real markets also move NOI—rent rolls, expense shocks, vacancy—so cap rates and income move together. Do not assume one headline rate change applies uniformly to every asset class or every submarket.",
    "Tenant occupancy-cost analysis discounts cash a tenant pays under a lease: base rent, recoveries, concessions, and timing. That is a tenant timeline question. Cap rate discounts building NOI for an owner or buyer. OccupancyNPV can put two lease paths on one timeline for a tenant decision; it does not replace a property cap rate. Keep the questions separate even when the same people ask both in one meeting.",
    "Before you quote a cap rate aloud, write four items: the NOI figure, whether it is trailing or stabilized, the price or value in the denominator, and the resulting percentage. If any item is missing, you are narrating a slogan. Ask for the operating statement, the rent roll supporting stabilized income, and the expense history that backs trailing income.",
    "A frequent mistake is mixing tenant recoveries into NOI without understanding what the lease allows. Another is applying the same cap rate haircut to every asset type—office near-term rollover, industrial with long WALT, retail with expense volatility—without adjusting the income story first. A third is treating a broker’s market cap rate quote as if it were your building’s cleared price.",
    "Partial occupancy changes which NOI belongs in the conversation. A building at seventy percent leased may have a trailing NOI that understates stabilized potential, or overstated if temporary income is propped up by short-term deals. Label the occupancy assumption behind the NOI. If the asset is mid-lease-up, say so before you compare yields to fully leased comps.",
    "Dark stores, single-tenant specials-use assets, and properties with heavy near-term capex need more than one ratio. Cap rate still uses the same identity, but the NOI input may require explicit adjustments you document. If you cannot defend the numerator, do not defend the percentage.",
    "Interest rates and credit conditions influence what buyers can pay and what yield they require, but financing math does not replace cap rate. Debt service coverage and loan constants belong in a separate workbook. When someone jumps from a cap rate conversation to a mortgage payment without reconciling NOI, redirect to the income statement first.",
    "Cap rate alone will not tell you whether to buy, sell, or hold. It summarizes one relationship between income and price at a moment in time. You still need growth assumptions, capex, environmental and legal diligence, and—for tenants on the other side of the table—a separate occupancy-cost compare. Use cap rate as a checkpoint, not as the entire decision.",
    "Buyers use cap rate to compare deals and to sanity-check seller pricing. Sellers use indicated value from NOI and market yields to anchor asks. Brokers translate between trailing and stabilized stories. Everyone uses the same division; they disagree about inputs. Your job in a meeting is to make inputs visible.",
    "If you are a tenant representative, you may hear cap rate language when discussing building sale or refinance pressure on rents. That is context for occupancy cost negotiations, not a substitute for modeling your lease. Link out to lease comparison tools when the decision is cash under your lease, not building NOI.",
    "The Appraisal Institute publishes standards and education on income capitalization. NAIOP and BOMA publish material on operating expenses and property performance that informs how practitioners talk about NOI components. Federal Reserve materials help explain rate cycles at a high level. Cite sources that match the claim you make; do not pile links to satisfy a count.",
    "If first-year CAM estimates matter to your occupancy cost, read the CAM first-year article. If rate moves are the question, read the interest-rate and property value article. If you need two leases on one timeline, use the lease comparison pages. This article stays on property yield math.",
    "This page is general information, not appraisal, legal, tax, or investment advice. It does not predict market cap rates for your submarket. Numbers in examples are labeled and rounded for clarity. Confirm operating data with primary documents before you sign or bid.",
    "When stakeholders ask for a single cap rate to settle a debate, return to the worksheet: NOI, denominator, label, percent. If two parties use different NOIs, they can both be “right” on arithmetic and wrong on alignment. Align inputs first; divide second.",
    "Stabilized NOI often excludes one-time capex, legal settlements, unusual repairs, and owner-specific expenses that trailing actuals include. Document every exclusion. A buyer will ask; a seller should answer before the LOI. Transparency on adjustments beats a polished percentage.",
    "This page has a clear limitation: it is educational math for commercial real estate, not legal advice, not tax advice, and not an appraisal. It does not automatically tell you what to bid; it tells you how to read the yield conversation honestly.",
    "Vacancy and credit loss belong in stabilized NOI when you underwrite as an investor. Using gross rent without vacancy when the market clears deals on net income produces optimistic indicated values. Match the convention used in the comps you cite.",
    "Expense stops and gross leases change who pays which operating line, but NOI for the building still reflects income minus operating expenses under the leases in place. Do not confuse tenant occupancy cost with owner NOI when a lease is net versus gross.",
    "Cap rate compression and expansion are market phrases for yields moving down or up. Compression raises indicated value if NOI is flat; expansion lowers it. The phrase does not replace knowing your NOI and your denominator.",
    "If you export a cap rate from a spreadsheet, attach the rent roll and expense lines that feed it. Screenshots without sources age poorly in diligence. A percentage without a path back to the operating statement is a liability in underwriting.",
    "Revisit the identity after major events—new anchor tenant, lost tenant, tax reassessment, insurance spike. The correct cap rate conversation after an event starts with a revised NOI, not with last month’s quoted yield from a comp sheet.",
    "For portfolio reviews, rank assets by clarity of NOI first, then by yield. An asset with messy books and a catchy cap rate belongs in the cleanup queue, not in the top quartile on headline metrics alone.",
    "When someone compares your building to a “market cap rate,” ask which comp set, which NOI basis, and which date. Markets move; comps stale. Your building’s story is specific even when the formula is universal.",
    "OccupancyNPV focuses on tenant cash paths. Use it when the decision is lease A versus lease B. Use cap rate when the decision is price versus income for the asset. Crossing the streams produces confident wrong answers.",
    "Write the next step you will take after reading: request the T-12 and rent roll, label stabilized NOI, compute indicated value at two yields, and only then discuss whether the ask clears the market. That sequence respects both the math and the people in the room.",
    "In underwriting meetings, put the formula on the whiteboard once: NOI over price equals cap rate. Then list disagreements as disagreements about inputs, not about arithmetic. That habit prevents circular arguments where two teams repeat the same percentage with different hidden assumptions.",
    "Industrial, office, retail, and multifamily each carry different expense rhythms and lease structures, so the NOI line that feeds cap rate should reflect the asset’s actual leases—not a generic template from another property type. Comps only help when the income and risk profile rhymes with your subject.",
    "If you inherit a pro forma from a seller, rebuild at least one year of NOI from source documents. Pro formas advertise; T-12 and rent rolls testify. Your cap rate is only as honest as the testimony behind the numerator.",
    "When you stress-test, change one input at a time: raise expenses ten percent, drop occupancy one notch, or shift the yield fifty basis points. Note which change moves indicated value enough to change a bid. That sensitivity table belongs next to the headline cap rate, not in a footnote no one reads.",
    "Cap rate conversations go wrong when speed beats clarity. Slow down long enough to say trailing or stabilized, to name the price or value, and to separate tenant lease math from building income math. The identity rewards careful speakers and exposes careless ones.",
    "How is cap rate calculated for a commercial building? NOI divided by value or price, expressed as a going-in yield. What NOI belongs in the formula? Stabilized NOI for most value talks; trailing NOI when you label recent actuals and everyone accepts them. Why is occupancy-cost NPV not a cap rate? Tenant occupancy-cost paths discount what a tenant pays; a property yield discounts building income—they are separate questions. What mistake turns a 6 percent yield into a wrong price? Using the wrong NOI, mixing tenant recoveries into the numerator, or applying the same percentage without checking the income story.",
    "What is still out of scope for this page? Lease-by-lease negotiation tactics, legal interpretation of leases, and automated market-average cap rates for your submarket. This article does not replace counsel or an appraisal. It gives you the identity and the discipline to ask for the right backup before you trust a headline yield.",
  ]);

  const faqs = [
    {
      question: "Is cap rate the same as occupancy cost?",
      answer: "No. Cap rate uses building net operating income and price or value. Occupancy cost is what a tenant pays under a lease, including rent and recoveries.",
    },
    {
      question: "Can I use trailing NOI in a cap rate?",
      answer: "Yes if you label it trailing and everyone agrees the asset’s income matches that period. Stabilized NOI is common for value discussions when lease-up is complete or modeled.",
    },
    {
      question: "Does a lower cap rate always mean a better deal?",
      answer: "It means the market is pricing the same NOI at a higher value. Whether that is attractive depends on growth, risk, capex, and your required return—not the headline alone.",
    },
  ];

  return { answer, headings, body, faqs };
}
