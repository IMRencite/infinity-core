import {
  CANONICAL_FOOTER_COPY,
  CANONICAL_IMR_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITY_OS_LABEL,
  CANONICAL_INFINITY_OS_URL,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_TERMS_LABEL,
} from "@/lib/infinity/venture-build-orchestration/constants";

export function askReviewFooterHtml(basePath = "/askreview"): string {
  return `<footer class="askreview-footer" data-infinity-footer="public" data-footer-format="${CANONICAL_FOOTER_COPY}">
<nav aria-label="Legal and venture attribution">
<a href="${basePath}/privacy-policy/">${CANONICAL_PRIVACY_LABEL}</a>
<span aria-hidden="true">|</span>
<a href="${basePath}/terms-of-service/">${CANONICAL_TERMS_LABEL}</a>
<span aria-hidden="true">|</span>
<a href="${basePath}/sitemap.xml">${CANONICAL_SITEMAP_LABEL}</a>
<span aria-hidden="true">|</span>
<a href="${CANONICAL_INFINITY_OS_URL}">${CANONICAL_INFINITY_OS_LABEL}</a>
<span aria-hidden="true">|</span>
<a href="${CANONICAL_IMR_URL}">${CANONICAL_IMR_LABEL}</a>
</nav>
</footer>`;
}

export function evaluateAskReviewFooterContract(html: string): { result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!html.includes(CANONICAL_PRIVACY_LABEL)) reasons.push("privacy");
  if (!html.includes(CANONICAL_TERMS_LABEL)) reasons.push("terms");
  if (!html.includes(CANONICAL_SITEMAP_LABEL)) reasons.push("sitemap");
  if (!html.includes(CANONICAL_INFINITY_OS_LABEL)) reasons.push("infinity");
  if (!html.includes(CANONICAL_IMR_LABEL)) reasons.push("imr");
  if (!html.includes(CANONICAL_INFINITY_OS_URL)) reasons.push("infinity_url");
  if (!html.includes(CANONICAL_IMR_URL)) reasons.push("imr_url");
  if (/An Infinite OS Venture/.test(html)) reasons.push("rejected_wording");
  if ((html.match(/https:\/\/imros\.io/g) ?? []).length > 1) reasons.push("duplicate_infinity_url");
  if ((html.match(/https:\/\/infinitemediaresources\.com/g) ?? []).length > 1) reasons.push("duplicate_imr_url");
  return { result: reasons.length ? "FAIL" : "PASS", reasons };
}
