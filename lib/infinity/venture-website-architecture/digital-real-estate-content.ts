export type YearRow = { rent: number; cam: number; credit: number; note: string };

export type AuthorityPageSpec = {
  route: string;
  question: string;
  directAnswer: string;
  definition: string[];
  why: string[];
  how: string[];
  formula: string;
  inputs: Array<[string, string]>;
  years: YearRow[];
  rate: number;
  exampleName: string;
  assumptions: string[];
  edges: string[];
  mistakes: string[];
  decisions: string[];
  compare: string[];
  limits: string[];
  whenNot: string[];
  related: Array<{ href: string; label: string }>;
  sources: Array<{ href: string; label: string; reason: string; claim: string }>;
  cta: { href: string; label: string };
  midCta: { href: string; label: string };
  finalCta: { href: string; label: string };
  personaNote?: { title: string; body: string };
};

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function extendYears(years: YearRow[], target = 10): YearRow[] {
  const next = [...years];
  while (next.length < target) {
    const prior = next[next.length - 1];
    const later = next.length + 1;
    next.push({
      rent: Math.round(prior.rent * 1.03),
      cam: Math.round(prior.cam * 1.03),
      credit: 0,
      note:
        later % 2 === 0
          ? `Keep this later year in the sum for ${later > 6 ? "the long path" : "the sample"}.`
          : `The row still belongs in the sum for ${later > 6 ? "the long path" : "the sample"}.`,
    });
  }
  return next;
}

export function narrateYears(name: string, years: YearRow[], rate: number): string[] {
  const out: string[] = [];
  let total = 0;
  const pct = Math.round(rate * 100);
  extendYears(years).forEach((row, index) => {
    const year = index + 1;
    const cash = row.rent + row.cam - row.credit;
    const pv = cash / (1 + rate) ** year;
    total += pv;
    const opens = [
      `Year ${year} of ${name} has rent of ${money(row.rent)}.`,
      `Next, year ${year} rent is ${money(row.rent)}.`,
      `Then year ${year} rent is ${money(row.rent)}.`,
      `After that, year ${year} rent is ${money(row.rent)}.`,
      `In year ${year} of ${name}, rent is ${money(row.rent)}.`,
    ];
    const cams = [
      `Shared building cost is ${money(row.cam)}.`,
      `CAM, which is a shared building cost, is ${money(row.cam)}.`,
      `Extras for the building come to ${money(row.cam)}.`,
      `The shared building cost this time is ${money(row.cam)}.`,
    ];
    const credits =
      row.credit > 0
        ? [
            `A credit of ${money(row.credit)} lowers the cash you pay that year.`,
            `You get ${money(row.credit)} back as a credit that year.`,
            `That year a ${money(row.credit)} credit cuts what you pay.`,
          ]
        : [
            `No extra credit shows up this year.`,
            `There is no credit in this year.`,
            `Credits skip this year.`,
          ];
    const nets = [
      `Cash out this year is about ${money(cash)}.`,
      `You pay about ${money(cash)} this year after extras and credits.`,
      `The net cash this year is about ${money(cash)}.`,
    ];
    const shrinks = [
      `Later cash gets a shrink for time. At ${pct} percent, year ${year} is worth about ${money(pv)} today.`,
      `Time shrinks later cash. At ${pct} percent, year ${year} is worth about ${money(pv)} today.`,
      `Waiting has a price. At ${pct} percent, year ${year} is worth about ${money(pv)} today.`,
    ];
    out.push(opens[index % opens.length]);
    out.push(cams[index % cams.length]);
    out.push(credits[index % credits.length]);
    out.push(`${nets[index % nets.length]} ${row.note}`);
    out.push(shrinks[index % shrinks.length]);
  });
  out.push(`Add those year values. The sample NPV for ${name} is about ${money(total)}. This is a teaching sample, not a client result.`);
  return out;
}

export function AUTHORITY_SOURCES() {
  return {
    investopediaNpv: { href: "https://www.investopedia.com/terms/n/npv.asp", label: "Investopedia — net present value", reason: "Plain definition of NPV", claim: "NPV discounts later cash" },
    investopediaDiscount: { href: "https://www.investopedia.com/terms/d/discountrate.asp", label: "Investopedia — discount rate", reason: "Discount-rate definition", claim: "A discount rate prices waiting" },
    bls: { href: "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm", label: "U.S. BLS — real estate brokers", reason: "Government occupation context", claim: "Brokers advise clients on property deals" },
    naiop: { href: "https://www.naiop.org/", label: "NAIOP", reason: "Professional CRE organization", claim: "Commercial real estate is a professional field" },
    boma: { href: "https://www.boma.org/", label: "BOMA", labelLong: "BOMA", reason: "Building operations authority", claim: "Buildings have shared operating costs" },
    fasb: { href: "https://www.fasb.org/", label: "FASB", reason: "Accounting standards organization", claim: "Lease accounting has formal rules" },
    census: { href: "https://www.census.gov/programs-surveys/cbp.html", label: "U.S. Census Bureau — County Business Patterns", reason: "Government business data home", claim: "Establishments are counted in official data" },
  } as const;
}
