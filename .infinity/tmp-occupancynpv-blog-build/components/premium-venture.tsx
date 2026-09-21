import type { ReactNode } from "react";

export function IconMark({ label }: { label: string }) {
  return (
    <svg className="pv-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <title>{label}</title>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 15l3-3 3 2 4-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ProductUiFrame({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="pv-product-frame" data-visualization="PRODUCT_UI_FRAME">
      <figcaption className="pv-caption">{title}</figcaption>
      {children}
      <p className="pv-caption">{caption}</p>
    </figure>
  );
}
