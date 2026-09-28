/**
 * Customer-facing interest rates / property values article — V5 from-zero body.
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_INTEREST_RATES_TOPIC: PageTopicBoundary = {
  page_id: "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  venture_id: "occupancynpv",
  primary_topic: "interest rates and commercial property values",
  primary_reader_job: "Explain how financing costs change required yield and indicated value without confusing tenant lease NPV.",
  must_cover: ["required yield", "same NOI", "indicated value", "LTV", "DSCR", "credit spread"],
  allowed_supporting: ["cap rate hub link", "lease compare link", "refinance checklist"],
  out_of_scope_for_page: ["tenant shirt", "bike night", "detailed CAM worksheet"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyInterestRatesV5Body() {
  const answer =
    "When borrowing costs rise, buyers often require a higher unlevered income yield to pay the same price. Same NOI at a higher cap rate is a lower indicated value. That is a property-valuation story, not a tenant occupancy-cost NPV.";

  const headings = [
    "Which interest rates are relevant to commercial real estate",
    "Why borrowing costs matter for value",
    "How interest rates influence required returns",
    "Valuation: NOI, cap rate, and property-specific risk",
    "Financing: LTV, DSCR, debt yield, and loan structure",
    "Buyer impact",
    "Seller impact",
    "Owner and operator impact",
    "How different property types can react",
    "Market context without inventing averages",
    "Scenario analysis on the same NOI",
    "Financing example: loan sizing, equity, and DSCR",
    "Cap rate, yield on cost, and cash-on-cash",
    "What Owners Should Review When Rates Change",
    "Decision support for buyers, owners, sellers, and operators",
    "Common mistakes and misconceptions",
    "Limitations and tradeoffs",
    "Key takeaways",
    "Related reading on OccupancyNPV",
  ];

  const body = paragraphs([
    "How do interest rates affect commercial property values? They change the cost of capital, which changes the required yield buyers need on net operating income. Same NOI at a higher required yield implies a lower indicated value. That link is about property income and price. It is not a tenant occupancy-cost NPV question.",
    "A Federal Reserve policy rate is not the same as a commercial mortgage coupon. Treasury yields are a benchmark. Credit spreads sit on top. Local lender risk appetite and the specific loan structure set the quote you can close. Those layers can move at different times: a policy-rate cut can leave commercial mortgage rates sticky if credit spreads widen or lenders pull proceeds.",
    "Debt service is cash the loan requires before equity sees residual cash. Higher rates raise debt service for the same principal. At a fixed loan-to-value (LTV), debt-service coverage (DSCR) can fall unless NOI rises or the buyer reduces leverage and brings more cash equity. Unlevered buyers still reprice because their opportunity cost moved even if they never draw a loan.",
    "Buyers compare a going-in yield with the cost of debt and with other uses of equity. If debt is more expensive, a leveraged buyer may accept a lower price for the same NOI so the going-in yield still covers a tighter debt-service cushion. Required yield and indicated value move together when NOI is held constant.",
    "Cap rates do not move 1:1 with Treasury or Fed rates. Credit spread, property-specific risk, and transaction liquidity sit between the benchmark and the bid. A hundred-basis-point policy move is not a hundred-basis-point cap-rate move on every asset. Liquidity can keep bids wide even when the arithmetic is clear.",
    "Indicated value is NOI divided by the going-in capitalization rate. Same NOI at a higher cap rate is a lower indicated value. NOI growth can offset part of that pressure; NOI decline can amplify it. Property-specific risk still matters: tenant credit, remaining term, expense recovery, and deferred capital can keep two buildings from sharing one yield.",
    "Loan-to-value is principal divided by value or price. DSCR is NOI divided by annual debt service. Debt yield is NOI divided by loan amount. A higher coupon can fail a coverage or debt-yield test before the cap-rate conversation finishes. Interest-only periods can hide pressure until amortization starts. Floating-rate loans transmit a rate move into debt service before a sale. Balloon and maturity risk appear when proceeds no longer support the same LTV.",
    "Higher rates often mean lower leverage capacity, a higher cash-equity requirement, and a higher return hurdle. Pricing discipline shows up as sensitivity analysis: hold NOI fixed and change yield, then change NOI, then change leverage. Report all three rather than one headline cut.",
    "The buyer pool can shrink when proceeds and coverage tighten. Pricing expectations that last marked a lower yield meet a wider bid-ask. Time-on-market can stretch until someone yields or NOI improves. Hold vs sell is a comparison of the bid you can clear against the hold income path, not a slogan about rates alone.",
    "Lease rollover, tenant quality, and expense control move NOI while the rate story is happening. Capital-expenditure plans and the refinancing timeline belong in the same workbook. A clean occupancy print does not prove coverage will survive a new coupon.",
    "Office stacks with near-term rollover often transmit a rate move through NOI as well as through yield. Retail depends on recovery and credit. Industrial with remaining term and recovered expenses can hold NOI while the bid still reprices. Multifamily can reprice rents faster than a long industrial lease, which can offset some yield pressure or add turnover cost. Do not invent one percentage decline for every asset class.",
    "Federal Reserve policy, Treasury yields, credit spreads, and lender risk appetite are separate inputs. Local supply, demand, and transaction liquidity decide whether a bid clears. This page does not publish a current market-average cap rate or a dated Fed path; those need a source with a retrieval date.",
    "Start with $120,000 of NOI and a 6% going-in cap rate. Indicated value is $2,000,000. Hold NOI fixed and move the yield to 7%. Indicated value falls to about $1,714,286. Now raise NOI to $135,000 at the same 7% yield. Indicated value becomes $1,928,571—an offset that recovers much of the gap but does not automatically restore the $2,000,000 starting mark. Higher interest rates do not always lower values by the same amount; yield and income both have to be named.",
    "Assume a $2,000,000 purchase, 65% LTV, a $1,300,000 loan, and interest-only debt so annual debt service equals the coupon times principal. At 6%, annual debt service is $78,000. At $120,000 NOI, DSCR is 1.54x and cash after debt service is $42,000 on $700,000 equity. At 8% on the same principal, annual debt service is $104,000, DSCR falls to 1.15x, and cash after debt service is $16,000. If a lender keeps a 1.25x DSCR floor, the loan must shrink: allowed service is $96,000, so principal at 8% is $1,200,000 and equity required rises to $800,000.",
    "Going-in cap rate is current or stabilized NOI over price. Yield on cost is stabilized NOI over total project cost. Cash-on-cash is levered cash after debt service over equity. A higher rate can leave the unlevered cap-rate story intact while cash-on-cash falls because coverage tightened.",
    "When rates change, owners should review debt maturity schedule and balloon dates; rate structure (fixed, floating, interest-only, amortizing); DSCR, LTV, and debt yield at the new coupon; tenant rollover and NOI after vacancy; cap-rate scenarios with the same NOI and with changed NOI; refinance proceeds versus remaining principal; comparable sales that actually cleared; and current lender quotes—not a remembered spread. Use a checklist and write down the numbers you will stress.",
    "Buyers should show yield, NOI, and leverage cases before they treat a headline rate as a finished price. Owners should put refinance and rollover on one page. Sellers should price the bid they can clear. Operators should treat expense control and capex as NOI tools. None of this is personalized financial advice.",
    "Common errors include using a property cap rate as the discount rate for a tenant lease comparison; assuming every asset reprices by the same percentage as a policy-rate move; ignoring leverage, DSCR, and debt yield when the story is rates; mixing trailing and projected NOI without labeling the numerator; and treating a Fed print as a commercial mortgage quote.",
    "Cap rates are not mechanically tied to rates. Local market, property quality, tenant credit, lease structure, NOI assumptions, and debt structure all matter. This page has a clear limitation: it is general information, not legal advice, not an appraisal, and not automatically a signal to buy or sell. OccupancyNPV compares occupancy-cost paths; when discount-rate sensitivity of two leases is the job, use the lease tools—not this property yield note.",
    "Rates change required yields. Same NOI at a higher yield is a lower indicated value. NOI, leverage, and lease durability can offset or amplify that move. Fed rates are not commercial mortgage rates. Tenant NPV remains a different tool.",
    "How do interest rates affect commercial property values? Through required yield and financing capacity on the same NOI. Which interest rates matter? Federal Reserve policy, Treasury yields, credit spread, and the commercial mortgage quote you can close. Why do cap rates not move one-for-one with Fed or Treasury rates? Because credit spread, liquidity, and property-specific risk sit in between. How do LTV, DSCR, and debt yield change when rates rise? Debt service rises; coverage and proceeds can fail before value math finishes. Do higher rates always lower values? Not always—NOI growth can offset; cuts are not automatic. How should owners review refinance when rates change? Model maturity, balloon, and coverage at the new coupon.",
    "If cap rate identity is the gap, read how cap rate is calculated for a building. If first-year recoveries matter to your occupancy cost, read the CAM first-year article. If two leases need one timeline, use the lease comparison pages. This article stays on rates, yields, and indicated value.",
    "Write the next step: open your maturity schedule, run same-NOI at two yields, then run coverage at the quoted commercial mortgage rate—not the headline you saw on the news.",
  ]);

  const faqs = [
    {
      question: "Do higher interest rates always lower property values?",
      answer: "No. A higher required yield pressures price only if NOI, liquidity, and risk do not offset it. NOI growth can recover part of the gap. A one-for-one cut is not automatic.",
    },
    {
      question: "What is the difference between Fed rates and commercial mortgage rates?",
      answer: "The Federal Reserve sets a policy rate. Commercial mortgages price from Treasury yields plus a credit spread and lender appetite. Those layers can move at different times.",
    },
    {
      question: "Is that the same as a tenant lease NPV?",
      answer: "No. Financing-cost valuation is a buyer-yield story. Tenant NPV is occupancy cost over time—not a tenant question.",
    },
  ];

  return { answer, headings, body, faqs };
}
