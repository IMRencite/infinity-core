import type { ReactNode } from "react";
import { askReviewFooterHtml } from "@/lib/infinity/askreview-product/public-footer";
import { ASKREVIEW_LOGIN_PATH, ASKREVIEW_PUBLIC_PATH, ASKREVIEW_WORKING_NAME } from "@/lib/infinity/second-venture-factory/constants";
import "./askreview.css";

export const metadata = {
  title: `${ASKREVIEW_WORKING_NAME} — Google review request kits`,
  description: "Generate a Google review link, QR mark, and request copy for a local business location. Independent software. Not a Google partner. Payment is not activated.",
  robots: { index: false, follow: false },
};

export default function AskReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="askreview-shell" data-answer-first="true">
      <header className="askreview-nav">
        <a href={ASKREVIEW_PUBLIC_PATH}><strong>{ASKREVIEW_WORKING_NAME}</strong></a>
        <nav aria-label="Primary">
          <ul>
            <li><a href={`${ASKREVIEW_PUBLIC_PATH}#how-it-works`}>How it works</a></li>
            <li><a href={`${ASKREVIEW_PUBLIC_PATH}/support`}>Support</a></li>
            <li><a href={ASKREVIEW_LOGIN_PATH}>Sign In</a></li>
          </ul>
        </nav>
        <nav className="askreview-nav-mobile" aria-label="Mobile">
          <a href={ASKREVIEW_LOGIN_PATH}>Sign In</a>
        </nav>
      </header>
      {children}
      <div dangerouslySetInnerHTML={{ __html: askReviewFooterHtml() }} />
    </div>
  );
}
