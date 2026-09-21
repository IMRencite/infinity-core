import { premiumValidationGlobalCss } from "@/lib/infinity/public-venture-design";
import type { VentureDesignTokens } from "@/lib/infinity/public-venture-design/types";

export function premiumAuthoritySiteCss(tokens: VentureDesignTokens): string {
  return `${premiumValidationGlobalCss(tokens)}
.pv-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--pv-surface) 92%, transparent);
  border-bottom: 1px solid var(--pv-border);
  backdrop-filter: blur(8px);
}
.pv-nav-inner {
  width: min(100% - 2rem, var(--pv-max));
  margin: 0 auto;
  min-height: 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.pv-nav-brand { color: var(--pv-text); text-decoration: none; font-weight: 700; letter-spacing: -0.03em; }
.pv-nav-links { display: flex; flex-wrap: wrap; gap: 0.85rem 1.1rem; align-items: center; }
.pv-nav-links a { color: var(--pv-text); text-decoration: none; font-size: 0.95rem; }
.pv-nav-links a[aria-current="page"] { font-weight: 700; }
.pv-breadcrumb { width: min(100% - 2rem, var(--pv-max)); margin: 1rem auto 0; font-size: 0.86rem; color: var(--pv-muted); }
.pv-breadcrumb ol { display: flex; flex-wrap: wrap; gap: 0.35rem; list-style: none; padding: 0; margin: 0; }
.pv-breadcrumb li:not(:last-child)::after { content: "/"; margin-left: 0.35rem; }
.pv-answer { max-width: var(--pv-content); font-size: 1.12rem; }
.pv-prose { max-width: 44rem; }
.pv-prose p, .pv-prose li { margin: 0 0 0.85rem; }
.pv-related, .pv-authority { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; }
.pv-article-hero { padding-top: 3rem; }
@media (max-width: 960px) {
  .pv-related, .pv-authority { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .pv-nav-inner { flex-direction: column; align-items: flex-start; padding: 0.85rem 0; }
}
`;
}
