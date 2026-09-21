import { OCCUPANCYNPV_AFFILIATE_TERMS } from "@/lib/infinity/affiliate-referral/terms";

function renderTerms(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (!line.trim()) return "";
      return `<p>${line}</p>`;
    })
    .join("");
}

export default function OccupancyNpvAffiliateTermsPage() {
  return (
    <main className="onpv-page onpv-page--dash" data-occupancynpv-affiliate-terms="true">
      <article
        className="onpv-card"
        data-affiliate-terms="true"
        dangerouslySetInnerHTML={{ __html: renderTerms(OCCUPANCYNPV_AFFILIATE_TERMS) }}
      />
    </main>
  );
}
