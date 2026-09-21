import { SOURCE_PRESENTATION_PATTERNS, SOURCE_QUALITY_CLASSES } from "./constants";
import { answerWordCount, extractAnswerFirstBlocks, extractInternalHrefsInBody } from "./page-inspect";
import type { AnswerChunk, CitationReadinessProfile, QuestionNode, SourceIndependence, SourceQualityClass } from "./types";

export function classifySourceQuality(url: string): SourceQualityClass {
  const host = url.toLowerCase();
  if (/bls\.gov|census\.gov|\.gov\//.test(host)) return "GOVERNMENT";
  if (/fasb\.org|sec\.gov/.test(host)) return "PROFESSIONAL_ORGANIZATION";
  if (/naiop\.org|boma\.org/.test(host)) return "PROFESSIONAL_ORGANIZATION";
  if (/investopedia\.com|wikipedia\.org/.test(host)) return "RECOGNIZED_REFERENCE";
  if (/edu\//.test(host) || /\.edu$/.test(host)) return "ACADEMIC";
  if (/reddit\.com|forum|community/.test(host)) return "COMMUNITY_SIGNAL";
  if (/^https?:\/\//.test(url)) return "SECONDARY_CREDIBLE";
  return "UNKNOWN";
}

export function sourcePresentationPatterns() {
  return SOURCE_PRESENTATION_PATTERNS;
}

export function evaluateSourceIndependence(urls: string[]): SourceIndependence {
  const origins = urls.map((url) => {
    try {
      return new URL(url).host.replace(/^www\./, "");
    } catch {
      return url;
    }
  });
  const uniqueOrigins = new Set(origins).size;
  const sameOriginDuplicates = Math.max(0, origins.length - uniqueOrigins);
  return {
    model: "SourceIndependence",
    uniqueOrigins,
    sameOriginDuplicates,
    independentCorroboration: uniqueOrigins >= 2,
    falselyClaimedCorroboration: false,
  };
}

export function evaluateCitationReadiness(input: {
  question: string;
  answer: string;
  entityRefs: string[];
  sourceRefs: string[];
}): CitationReadinessProfile {
  const words = answerWordCount(input.answer);
  const clearSubject = /\b(NPV|lease|discount rate|allowance|CAM|rent|workflow|pricing|tenant)\b/i.test(input.answer);
  const clearPredicate = /\b(is|converts|compares|discounts|places|does not|should)\b/i.test(input.answer);
  const explicitEntities = input.entityRefs.length > 0 || /NPV|discount rate|tenant improvement|occupancy/i.test(input.answer);
  const selfContained = words >= 18 && !/^(this|it|they)\b/i.test(input.answer.trim());
  const marketingFluff = /game.?changer|unlock|skyrocket|guaranteed|#1|trusted by/i.test(input.answer);
  const factualGrounding = !marketingFluff && Boolean(input.question) && words >= 12;
  const sourceSupport = input.sourceRefs.length > 0;
  const overall =
    clearSubject && clearPredicate && explicitEntities && selfContained && factualGrounding && !marketingFluff ? "PASS" : "FAIL";
  return {
    model: "CitationReadinessProfile",
    clearSubject: clearSubject ? "PASS" : "FAIL",
    clearPredicate: clearPredicate ? "PASS" : "FAIL",
    explicitEntities: explicitEntities ? "PASS" : "FAIL",
    selfContained: selfContained ? "PASS" : "FAIL",
    factualGrounding: factualGrounding ? "PASS" : "FAIL",
    sourceSupport: sourceSupport ? "PASS" : "FAIL",
    marketingFluffInAnswer: marketingFluff,
    overall,
  };
}

export function extractAnswerChunks(input: {
  route: string;
  content: string;
  questions: QuestionNode[];
  sourceRefs: string[];
}): AnswerChunk[] {
  const blocks = extractAnswerFirstBlocks(input.content);
  const links = extractInternalHrefsInBody(input.content);
  return blocks.map((block, index) => {
    const match = input.questions.find((node) => node.question.toLowerCase() === block.question.toLowerCase())
      ?? input.questions.find((node) => node.mappedRoute === input.route);
    const citation = evaluateCitationReadiness({
      question: block.question,
      answer: block.answer,
      entityRefs: match?.entityRefs ?? [],
      sourceRefs: input.sourceRefs,
    });
    return {
      questionId: match?.questionId ?? `unmapped_${input.route}_${index}`,
      pageId: input.route,
      sectionId: `${input.route}#direct-answer`,
      directAnswer: block.answer,
      supportingContext: block.question,
      entityRefs: match?.entityRefs ?? [],
      sourceRefs: input.sourceRefs,
      internalLinkRefs: links,
      schemaRef: /FAQPage|Article/.test(input.content) ? "page-schema" : null,
      citationReadiness: citation,
      confidence: citation.overall === "PASS" && input.sourceRefs.length ? "HIGH" : citation.overall === "PASS" ? "MEDIUM" : "LOW",
    };
  });
}

export function knownSourceQualityClasses() {
  return SOURCE_QUALITY_CLASSES;
}
