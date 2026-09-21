import {
  CANONICAL_FOOTER_COPY,
  CANONICAL_IMR_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITY_OS_LABEL,
  CANONICAL_INFINITY_OS_URL,
  CANONICAL_PRIVACY_HREF,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_SITEMAP_HREF,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_TERMS_HREF,
  CANONICAL_TERMS_LABEL,
} from "./constants";
import type { FooterAttributionRequirement } from "./types";

export function canonicalFooterRequirement(): FooterAttributionRequirement {
  return {
    required: true,
    copy: CANONICAL_FOOTER_COPY,
    infinityOsLabel: CANONICAL_INFINITY_OS_LABEL,
    infinityOsUrl: CANONICAL_INFINITY_OS_URL,
    imrLabel: CANONICAL_IMR_LABEL,
    imrUrl: CANONICAL_IMR_URL,
    privacyLabel: CANONICAL_PRIVACY_LABEL,
    privacyHref: CANONICAL_PRIVACY_HREF,
    termsLabel: CANONICAL_TERMS_LABEL,
    termsHref: CANONICAL_TERMS_HREF,
    sitemapLabel: CANONICAL_SITEMAP_LABEL,
    sitemapHref: CANONICAL_SITEMAP_HREF,
    visible: true,
    crawlable: true,
    nofollowDefault: false,
    whiteLabelOverride: false,
  };
}

export function footerComponentSource(requirement: FooterAttributionRequirement): string {
  return `"use client";

import { GeneratedVentureImprovementTrigger } from "./venture-improvement-intake";

export function VentureFooter() {
  return (
    <footer className="vg-legal-footer" data-infinity-footer="public" style={{ display: "block", visibility: "visible", opacity: 1 }}>
      <div className="vg-container">
        <nav className="vg-legal-nav" aria-label="Legal and venture attribution" data-footer-format="${requirement.copy}">
          <a href="${requirement.privacyHref}">${requirement.privacyLabel}</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="${requirement.termsHref}">${requirement.termsLabel}</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="${requirement.sitemapHref}">${requirement.sitemapLabel}</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="${requirement.infinityOsUrl}">${requirement.infinityOsLabel}</a>
          <span className="vg-legal-sep" aria-hidden="true">|</span>
          <a href="${requirement.imrUrl}">${requirement.imrLabel}</a>
        </nav>
        <GeneratedVentureImprovementTrigger />
      </div>
    </footer>
  );
}
`;
}

export function validateFooterAttribution(files: Array<{ path: string; content: string }>): {
  ok: boolean;
  failures: string[];
} {
  const requirement = canonicalFooterRequirement();
  const publicFiles = files.filter((file) => /footer|layout|page\.(tsx|jsx|html)$/i.test(file.path));
  const blob = publicFiles.map((file) => file.content).join("\n");
  const failures: string[] = [];

  if (!blob.includes(requirement.copy) && !blob.includes(requirement.infinityOsLabel)) {
    failures.push("footer_copy_missing");
  }
  if (!blob.includes(requirement.privacyLabel)) failures.push("privacy_label_missing");
  if (!blob.includes(requirement.termsLabel)) failures.push("terms_label_missing");
  if (!blob.includes(requirement.sitemapLabel)) failures.push("sitemap_label_missing");
  if (!blob.includes(requirement.infinityOsLabel)) failures.push("infinity_os_label_missing");
  if (!blob.includes(requirement.imrLabel)) failures.push("imr_label_missing");
  if (!blob.includes(requirement.infinityOsUrl)) failures.push("infinity_os_url_missing");
  if (!blob.includes(requirement.imrUrl)) failures.push("imr_url_missing");
  if (/An Infinite OS Venture/.test(blob)) failures.push("rejected_infinite_os_wording");
  if (!/An Infinity OS Venture/.test(blob)) failures.push("infinity_os_wording_required");

  const linkFor = (href: string, label: string) =>
    new RegExp(
      `<a[^>]+href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "i",
    );

  if (!linkFor(requirement.privacyHref.replace(/\/$/, "/?"), requirement.privacyLabel).test(blob) &&
      !linkFor(requirement.privacyHref, requirement.privacyLabel).test(blob) &&
      !new RegExp(`href=["']${requirement.privacyHref.replace(/\/$/, "/?")}["']`).test(blob)) {
    failures.push("privacy_link_missing");
  }
  if (!new RegExp(`href=["']${requirement.termsHref.replace(/\/$/, "/?")}["']`).test(blob)) {
    failures.push("terms_link_missing");
  }
  if (!new RegExp(`href=["']${requirement.sitemapHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(blob)) {
    failures.push("sitemap_link_missing");
  }

  const infinityLink = new RegExp(
    `<a[^>]+href=["']${requirement.infinityOsUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const imrLink = new RegExp(
    `<a[^>]+href=["']${requirement.imrUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const infinityMatch = blob.match(infinityLink)?.[0] ?? "";
  const imrMatch = blob.match(imrLink)?.[0] ?? "";
  if (!infinityMatch) failures.push("infinity_os_link_missing");
  if (!imrMatch) failures.push("imr_link_missing");
  if (/rel=["'][^"']*nofollow/i.test(infinityMatch) || /rel=["'][^"']*nofollow/i.test(imrMatch)) {
    failures.push("nofollow_default_forbidden");
  }
  const withoutHrefs = blob
    .replace(/href=["']https:\/\/imros\.io["']/g, "")
    .replace(/href=["']https:\/\/infinitemediaresources\.com["']/g, "");
  if (/https:\/\/imros\.io/.test(withoutHrefs) || /https:\/\/infinitemediaresources\.com/.test(withoutHrefs)) {
    failures.push("raw_duplicate_branding_urls");
  }
  if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(blob) && /data-infinity-footer/.test(blob)) {
    const footerBlock = blob.slice(blob.indexOf("data-infinity-footer"));
    if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(footerBlock.slice(0, 400))) {
      failures.push("footer_not_visible");
    }
  }

  return { ok: failures.length === 0, failures };
}
