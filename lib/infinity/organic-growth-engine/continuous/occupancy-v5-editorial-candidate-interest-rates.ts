/**
 * Human-first editorial candidate for the interest-rates article (not yet wired to live compose).
 * Used for regression PASS vs dry legacy FAIL until a controlled Occupancy canary promotes it.
 */
function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyInterestRatesEditorialCandidateBody() {
  const answer =
    "When borrowing costs rise, buyers often require a higher unlevered income yield to pay the same price. Same NOI at a higher cap rate is a lower indicated value. That is a property-valuation story, not a tenant occupancy-cost NPV.";

  const headings = [
    "The rate print is not your mortgage quote",
    "Why debt service moves before the rent roll does",
    "When buyers demand a higher yield on unchanged income",
    "What still belongs to the asset—not the lender",
    "The loan that no longer fits",
    "What happens to bids when proceeds shrink",
    "What sellers feel when the bid-ask widens",
    "How asset types transmit the same rate shock differently",
    "A $286,000 gap before rent changes",
    "Worked numbers: two yields, one income stream",
    "Loan sizing when coverage breaks at 8%",
    "Cash-on-cash after debt can lie",
    "Refinance checklist when the coupon moves",
    "Mistakes that mix tenant NPV with property price",
    "Where this page stops (and lease tools begin)",
    "Related reading on OccupancyNPV",
  ];

  const body = paragraphs([
    "A building producing $120,000 of stabilized income can look like a $2 million asset at a 6% buyer yield. Move the market to 7% with the same rent roll, and almost $286,000 disappears before a single tenant leaves. That is why owners feel rate moves in the bid long before vacancy tells the story—and it is a property-yield question, not a tenant occupancy-cost NPV.",
    "The Federal Reserve policy rate is not the coupon on your commercial mortgage. Treasury yields are a benchmark; credit spreads and lender appetite sit on top. In practice, those layers move at different times: a policy cut can leave mortgage quotes sticky if spreads widen or proceeds shrink.",
    "Debt service is cash the loan takes before equity sees what is left. Higher coupons raise that payment on the same principal. Which means a leveraged buyer may need more equity, a lower price, or both to keep coverage honest—even if the rent roll never blinks.",
    "Buyers still compare going-in yield with debt cost and with other uses of cash. When debt is expensive, the price that clears often drops so the income yield still covers a tighter cushion. Unlevered buyers reprice too, because their opportunity cost moved even without drawing a loan.",
    "Spread, property risk, and liquidity sit between benchmark rates and the bid. A hundred-basis-point policy move is not a hundred-basis-point yield move on every asset. Thin markets can keep bids wide even when the arithmetic is obvious.",
    "Price from income follows a simple identity: stabilized NOI over the buyer’s yield. Growth in NOI can offset part of a yield shift; a weaker roll can amplify it. Tenant credit, remaining term, and expense recovery still split two buildings that look similar on a map.",
    "Leverage math bites early. Principal divided by value sets how much you borrow; annual debt payment divided into NOI sets coverage. A higher coupon can fail a coverage or debt-yield test before the cap conversation finishes. Interest-only periods hide pressure until amortization starts; floating debt transmits a rate shock into cash flow before a sale.",
    "When proceeds tighten, pricing discipline is a three-way stress: hold income fixed and move yield, then move income, then move leverage. Report all three instead of one headline cut from the news.",
    "The buyer pool can shrink when coverage and proceeds tighten. Last-cycle marks that assumed a lower yield meet a wider bid-ask; time-on-market stretches until someone yields or income improves. Hold versus sell is the bid you can clear against the hold path—not a slogan about rates.",
    "Lease rollover, tenant quality, and expense control move income while the rate story runs. Capex plans and refinance timing belong in the same workbook. A clean occupancy print does not prove coverage survives a new coupon.",
    "Office with near-term rollover often transmits a shock through income and through yield. Retail lives on recovery and credit. Long industrial leases can hold income while the bid still reprices. Multifamily can reprice rents faster—which can offset yield pressure or add turnover cost. Do not invent one percentage decline for every asset class.",
    "Start with $120,000 of NOI and a 6% going-in yield. Indicated value is $2,000,000. Hold income fixed and move the yield to 7%; value falls to about $1,714,286. Raise NOI to $135,000 at the same 7% yield and value becomes $1,928,571—an offset that recovers much of the gap but does not automatically restore the $2 million starting mark.",
    "Assume a $2,000,000 purchase at 65% leverage, a $1,300,000 interest-only loan, and a 6% coupon—annual debt service $78,000. At $120,000 NOI, coverage is 1.54x and cash after debt is $42,000 on $700,000 equity. At 8% on the same principal, service is $104,000, coverage falls to 1.15x, and cash after debt is $16,000. Before you refinance, model whether a 1.25x floor forces principal down to $1,200,000 and equity up to $800,000.",
    "Going-in yield is stabilized income over price. Yield on cost uses total project cost. Cash-on-cash is levered cash after debt over equity. A higher coupon can leave the unlevered story intact while cash-on-cash collapses because coverage tightened.",
    "When rates change, operators should review maturity and balloon dates, fixed versus floating structure, coverage and proceeds at the quoted coupon, rollover and vacancy scenarios, refinance proceeds versus remaining principal, comps that actually cleared, and current lender quotes—not a remembered spread. Write the numbers you will stress-test.",
    "Common errors include using a property yield as a tenant lease discount rate; assuming every asset reprices like a policy headline; ignoring leverage when the story is rates; mixing trailing and projected income without labeling the numerator; and treating a Fed print as a mortgage quote.",
    "This page is general information—not legal advice, not an appraisal, not a buy-or-sell signal. OccupancyNPV compares occupancy-cost paths; when two leases need one timeline, use the lease tools—not this property yield note.",
    "If cap rate identity is the gap, read how cap rate is calculated for a building. If first-year recoveries matter to your occupancy cost, read the CAM first-year article. If two leases need one timeline, use the lease comparison pages.",
    "Write the next step: open your maturity schedule, run unchanged income at two yields, then run coverage at the quoted commercial mortgage rate—not the headline you saw on the news.",
  ]);

  const faqs = [
    {
      question: "Do higher interest rates always lower property values?",
      answer: "No. A higher required yield pressures price only if income, liquidity, and risk do not offset it. Income growth can recover part of the gap.",
    },
    {
      question: "What is the difference between Fed rates and commercial mortgage rates?",
      answer: "The Federal Reserve sets a policy rate. Commercial mortgages price from Treasury yields plus spread and lender appetite.",
    },
    {
      question: "Is that the same as a tenant lease NPV?",
      answer: "No. Financing-cost valuation is a buyer-yield story. Tenant NPV is occupancy cost over time.",
    },
  ];

  return { answer, headings, body, faqs };
}
