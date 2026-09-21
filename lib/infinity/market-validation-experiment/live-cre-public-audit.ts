import {
  auditFooterContract,
  auditValidationGrade,
  LIVE_DEPLOYED_FOOTER_COPY,
  type ValidationGradeAudit,
} from "@/lib/infinity/public-venture-template";
import { SUCCESSOR_CRE_ARTIFACT_ID } from "./constants";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";

/**
 * Frozen structural snapshot of the immutable live artifact art_850f8be949fabef62674.
 * Do not HTTP-fetch the live validation URL here — that would emit PAGE_VIEW.
 */
export const LIVE_CRE_PUBLIC_ARTIFACT_FILES: Array<{ path: string; content: string }> = [
  {
    path: "app/page.tsx",
    content: `import Link from "next/link";
export default function Page() {
  return (
    <main>
      <p>Pilot / early access — this product is in validation and is not generally available.</p>
      <h1>Commercial Real Estate (CRE) Lease Comparison & NPV Calculator</h1>
      <Link href="/early-access">Request Pilot Access</Link>
      <ul><li>$290 / year</li><li>$149 / deal</li></ul>
    </main>
  );
}
`,
  },
  {
    path: "app/early-access/page.tsx",
    content: `"use client";
export default function EarlyAccessPage() {
  return (
    <main>
      <h1>Request Pilot Access</h1>
      <form>
        <label>Work email <input name="workEmail" /></label>
        <button type="submit">Request Pilot Access</button>
      </form>
      <footer>
        <p>${LIVE_DEPLOYED_FOOTER_COPY}</p>
        <p>
          <a href="https://imros.io">Infinity OS</a>
          {" · "}
          <a href="https://infinitemediaresources.com">IMR</a>
          https://imros.io https://infinitemediaresources.com
        </p>
      </footer>
    </main>
  );
}
`,
  },
  {
    path: "components/venture-footer.tsx",
    content: `export function VentureFooter() {
  return (
    <footer data-infinity-footer="public">
      <p>${LIVE_DEPLOYED_FOOTER_COPY}</p>
      <p>
        <a href="https://imros.io">Infinity OS</a>
        {" · "}
        <a href="https://infinitemediaresources.com">IMR</a>
      </p>
      <p>https://imros.io https://infinitemediaresources.com</p>
    </footer>
  );
}
`,
  },
  {
    path: "styles/globals.css",
    content: "body{font-family:sans-serif;margin:0;padding:1.5rem;line-height:1.5}footer{display:block;padding:1rem}\n",
  },
];

export function auditLiveCrePublicArtifact(): ValidationGradeAudit & {
  artifactId: typeof SUCCESSOR_CRE_ARTIFACT_ID;
  digest: typeof SUCCESSOR_CRE_SOURCE_DIGEST;
  mutated: false;
  footerAudit: ReturnType<typeof auditFooterContract>;
} {
  const design = auditValidationGrade(LIVE_CRE_PUBLIC_ARTIFACT_FILES);
  return {
    ...design,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    digest: SUCCESSOR_CRE_SOURCE_DIGEST,
    mutated: false,
    footerAudit: auditFooterContract(LIVE_CRE_PUBLIC_ARTIFACT_FILES),
  };
}
