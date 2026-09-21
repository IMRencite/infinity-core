import { writeFile } from "node:fs/promises";
import { reconstructCreHomepageHeroLinkContrastSuccessor } from "../lib/infinity/venture-website-architecture/cre-homepage-hero-link-contrast-successor.ts";
import { proveHomepageHeroAndAllRoutesRendered } from "../lib/infinity/venture-website-architecture/homepage-hero-rendered-proof.ts";
import {
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID,
  CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST,
} from "../lib/infinity/market-validation-experiment/constants.ts";

const successor = await reconstructCreHomepageHeroLinkContrastSuccessor();
if (successor.artifactId !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_ARTIFACT_ID) {
  throw new Error(`homepage_hero_id_drift:${successor.artifactId}`);
}
if (successor.digest !== CRE_HOMEPAGE_HERO_LINK_CONTRAST_SUCCESSOR_SOURCE_DIGEST) {
  throw new Error(`homepage_hero_digest_drift:${successor.digest}`);
}
if (!/^[a-f0-9]{64}$/.test(successor.digest) || successor.digest.includes(",")) {
  throw new Error(`homepage_hero_digest_semantics:${successor.digest}`);
}
const proof = await proveHomepageHeroAndAllRoutesRendered({ files: successor.files });
const report = {
  artifactId: successor.artifactId,
  digest: successor.digest,
  immutable: successor.immutable,
  routes: successor.routes,
  ...proof,
};
await writeFile(".infinity/homepage-hero-rendered-proof.json", `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (proof.heroOverall !== "PASS" || proof.renderedLinkContrast !== "PASS") {
  process.exitCode = 1;
}
