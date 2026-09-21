import { auditLiveRenderedLayout } from "@/lib/infinity/public-venture-design/rendered-layout";
import { renderedLayoutPassesPremiumAuthority } from "@/lib/infinity/public-venture-design/rendered-layout";
import {
  liveVerificationPassed as liveDrVerificationPassed,
  verifyDirectResponseSuccessorLivePublic,
} from "./cre-dr-successor-live-verify";
import { EXPECTED_FINAL_REPAIR_PUBLIC_ROUTES } from "./cre-final-repair-successor-authorization";
import { fetchPublicPath, type Gate } from "./validation-grade-live-verify";

function pass(ok: boolean): Gate {
  return ok ? "PASS" : "FAIL";
}

export async function verifyFinalRepairSuccessorLivePublic(input: {
  url: string;
  intendedRoutes?: string[];
  artifactId: string;
  experimentId: string;
  candidateId: string;
}) {
  const intended = [...new Set(input.intendedRoutes?.length ? input.intendedRoutes : [...EXPECTED_FINAL_REPAIR_PUBLIC_ROUTES])];
  const live = await verifyDirectResponseSuccessorLivePublic({
    ...input,
    intendedRoutes: intended,
  });
  const layout = await auditLiveRenderedLayout({ origin: input.url.replace(/\/$/, "") });
  const home = await fetchPublicPath(input.url, "/");
  const formPage = await fetchPublicPath(input.url, "/early-access");
  const npv = await fetchPublicPath(input.url, "/commercial-lease-npv");
  const hub = await fetchPublicPath(input.url, "/resources");
  const blob = `${home.body}\n${formPage.body}\n${npv.body}\n${hub.body}`;
  const candidate = pass(
    blob.includes(`data-candidate-id="${input.candidateId}"`) || blob.includes(input.candidateId),
  );
  const questionIds = [...blob.matchAll(/data-question-id="([^"]+)"/g)].map((match) => match[1]);
  const unique = [...new Set(questionIds)];
  const unstable = questionIds.filter((id) => !/^q_[0-9a-f]{16}$/.test(id)).length;
  return {
    ...live,
    form: {
      ...live.form,
      candidate,
    },
    renderedLayout: {
      bodyGutter: layout.result.bodyGutter,
      fullBleedInnerPadding: layout.result.fullBleedInnerPadding,
      footerPadding: layout.result.footerPadding,
      headerPadding: layout.result.headerPadding,
      containerAlignment: layout.result.containerAlignment,
      textMeasure: layout.result.textMeasure,
      verticalRhythm: layout.result.verticalRhythm,
      sectionComposition: layout.result.sectionComposition,
      horizontalOverflow: layout.result.horizontalOverflow,
      mobile: layout.result.mobile,
      premiumComposition: layout.result.premiumComposition,
      overall: renderedLayoutPassesPremiumAuthority(layout.result) ? ("PASS" as const) : ("FAIL" as const),
    },
    questionLive: {
      rendered: unique.length,
      missingRequired: unique.length === 0 ? 1 : 0,
      unstable,
      dataQuestionId: pass(unique.length > 0 && /data-question-id/.test(blob)),
      answerChunkIdentity: pass(/data-answer-chunk-id/.test(blob)),
    },
  };
}

export function finalRepairLiveVerificationPassed(
  live: Awaited<ReturnType<typeof verifyFinalRepairSuccessorLivePublic>>,
): boolean {
  return (
    liveDrVerificationPassed(live) &&
    live.form.candidate === "PASS" &&
    live.form.experiment === "PASS" &&
    live.form.successorArtifactLineage === "PASS" &&
    live.instrumentation.questionIdentity === "PASS" &&
    live.questionLive.dataQuestionId === "PASS" &&
    live.questionLive.missingRequired === 0 &&
    live.questionLive.unstable === 0 &&
    live.renderedLayout.overall === "PASS" &&
    live.renderedLayout.horizontalOverflow === 0
  );
}
