import { join } from "node:path";
import type { ApparelPrintArtProfile } from "./apparel-production-final-qc-v1.ts";

export type ClubThrottleCanonicalSku = {
  sku: string;
  conceptId: string;
  printArtProfile: ApparelPrintArtProfile;
  printMasterRel: string;
  providerAssetRel: string;
  structuralReferenceRel?: string;
  gelatoProductId: string;
  immutablePublicUrl?: string;
  expectedDpi?: number;
  requiresTypography?: boolean;
  requiresPrintLineWeight?: boolean;
  /** Founder Gelato dashboard visual — not inferred from API. */
  founderProviderVisualQc: "PASS" | "FAIL" | "PENDING_FOUNDER";
  founderCreativeFrozenPass?: boolean;
  kneeDownLineWeightPrintMasterRel?: string;
  kneeDownLineWeightProviderRel?: string;
};

export function clubThrottleCanonicalCatalog(cwd: string): ClubThrottleCanonicalSku[] {
  const art = (concept: string, file: string) =>
    join(cwd, `.infinity/commerce/club-throttle-artwork/${concept}/${file}`);

  return [
    {
      sku: "LOT_LINE",
      conceptId: "ct-lot-line-1",
      printArtProfile: "CINEMATIC_SCENE",
      printMasterRel: art("ct-lot-line-1", "print-master-lot-line-recreation-candidate-3-v1.png"),
      providerAssetRel: art(
        "ct-lot-line-1",
        "placement-candidates/gelato-gildan5000-large-back-recreation-candidate-3-final-3600w.png",
      ),
      gelatoProductId: "99913623-8656-42f9-a818-46fbf14b10eb",
      expectedDpi: 360,
      founderProviderVisualQc: "PASS",
      founderCreativeFrozenPass: true,
    },
    {
      sku: "CLEAN_RPM",
      conceptId: "ct-clean-rpm-phrase-1",
      printArtProfile: "ISOLATED_PRINT_GRAPHIC",
      printMasterRel: art("ct-clean-rpm-phrase-1", "print-master-deterministic-typography-rebuild.png"),
      providerAssetRel: art(
        "ct-clean-rpm-phrase-1",
        "gelato-gildan5000-large-back-founder-approved-final.png",
      ),
      structuralReferenceRel: art("ct-clean-rpm-phrase-1", "print-master-embedded-repair-5-post.png"),
      gelatoProductId: "3f108c32-d821-4df7-9cf7-fc23c2a11745",
      immutablePublicUrl:
        "https://club-throttle-aujt64rba-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-clean-rpm-phrase-1-founder-approved-5d5a37fe-large-back.png",
      expectedDpi: 335,
      requiresTypography: true,
      founderProviderVisualQc: "PASS",
      founderCreativeFrozenPass: true,
    },
    {
      sku: "DUALSPORT_DUST",
      conceptId: "ct-dualsport-dust-1",
      printArtProfile: "CINEMATIC_SCENE",
      printMasterRel: art("ct-dualsport-dust-1", "print-master-v1.png"),
      providerAssetRel: art("ct-dualsport-dust-1", "gelato-gildan5000-large-back-v1.png"),
      gelatoProductId: "b0c01e64-abb6-465d-9796-105032430b0a",
      immutablePublicUrl:
        "https://club-throttle-om8quiuah-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-dualsport-dust-1-9b3e77b4-large-back.png",
      expectedDpi: 335,
      founderProviderVisualQc: "PASS",
      founderCreativeFrozenPass: true,
    },
    {
      sku: "KNEE_DOWN",
      conceptId: "ct-knee-down-1",
      printArtProfile: "ISOLATED_PRINT_GRAPHIC",
      printMasterRel: art("ct-knee-down-1", "print-master-neutral-line-art-rebuild.png"),
      providerAssetRel: art("ct-knee-down-1", "gelato-gildan5000-large-back-founder-approved-final.png"),
      structuralReferenceRel: art("ct-knee-down-1", "print-master-embedded-repair-4.png"),
      gelatoProductId: "8755a8df-4827-43bd-9105-ce29078d78aa",
      immutablePublicUrl:
        "https://club-throttle-isbbizc0w-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-knee-down-1-line-weight-72350650-large-back.png",
      expectedDpi: 335,
      requiresPrintLineWeight: true,
      founderProviderVisualQc: "PASS",
      kneeDownLineWeightPrintMasterRel: art("ct-knee-down-1", "print-master-line-weight-strengthened.png"),
      kneeDownLineWeightProviderRel: art("ct-knee-down-1", "gelato-gildan5000-large-back-line-weight-final.png"),
    },
    {
      sku: "ZERO_CHILL_GARAGE",
      conceptId: "ct-zero-chill-phrase-1",
      printArtProfile: "ISOLATED_PRINT_GRAPHIC",
      printMasterRel: art("ct-zero-chill-phrase-1", "print-master-repair-2.png"),
      providerAssetRel: art("ct-zero-chill-phrase-1", "gelato-gildan5000-large-back-repair-2.png"),
      gelatoProductId: "e4a7a226-84d1-48a1-aea3-e4756534d4ac",
      immutablePublicUrl:
        "https://club-throttle-4bez8vxve-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-zero-chill-phrase-1-589f12bb-large-back.png",
      expectedDpi: 335,
      requiresTypography: true,
      founderProviderVisualQc: "PASS",
      founderCreativeFrozenPass: true,
    },
    {
      sku: "APEX_LINE",
      conceptId: "ct-apex-line-1",
      printArtProfile: "CINEMATIC_SCENE",
      printMasterRel: art("ct-apex-line-1", "print-master-repair-3.png"),
      providerAssetRel: art("ct-apex-line-1", "gelato-gildan5000-large-back-repair-3.png"),
      gelatoProductId: "f8424c9d-460b-408b-9f3e-efa281c92c94",
      immutablePublicUrl:
        "https://club-throttle-1tkv2077n-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-apex-line-1-b226ced8-large-back.png",
      expectedDpi: 335,
      requiresPrintLineWeight: true,
      founderProviderVisualQc: "PASS",
      founderCreativeFrozenPass: true,
    },
    {
      sku: "BAGGER_SEND",
      conceptId: "ct-bagger-send-1",
      printArtProfile: "CINEMATIC_SCENE",
      printMasterRel: art("ct-bagger-send-1", "print-master-repair-3.png"),
      providerAssetRel: art("ct-bagger-send-1", "gelato-gildan5000-large-back-repair-3.png"),
      gelatoProductId: "49c1dd23-be91-4a86-ac44-5cfb2bfd7e51",
      immutablePublicUrl:
        "https://club-throttle-owlq6qrbz-infinite-media-resources-imr.vercel.app/commerce-probe-gelato/ct-bagger-send-1-9c4b410f-large-back.png",
      expectedDpi: 335,
      founderProviderVisualQc: "PASS",
      founderCreativeFrozenPass: true,
    },
  ];
}
