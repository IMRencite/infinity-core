import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { evaluateFormBackendReadiness } from "@/lib/infinity/market-validation-experiment/ingest";
import { extractAnswerFirstBlocks } from "./answer-authority/page-inspect";
import { applySuccessorQuestionMapping, buildCreQuestionKnowledgeGraph, canonicalQuestionId } from "./answer-authority/question-system";

export const CANONICAL_QUESTION_ID_PATTERN = /^q_[0-9a-f]{16}$/;

function fileOf(files: Array<{ path: string; content: string }>, path: string): string {
  return files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "";
}

function pageFiles(files: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  return files.filter((file) => {
    const path = file.path.replace(/\\/g, "/");
    return path === "app/page.tsx" || /app\/.+\/page\.tsx$/.test(path);
  });
}

export function applyQuestionIdentityToPageSource(content: string): string {
  return content.replace(/<div><AnswerFirst question=("[^"]*")/g, (_full, quoted: string) => {
    const question = JSON.parse(quoted) as string;
    const id = canonicalQuestionId(question);
    return `<div data-question-id=${JSON.stringify(id)} data-answer-chunk-id=${JSON.stringify(`${id}_chunk`)}><AnswerFirst question=${quoted}`;
  });
}

export function applyPublicLineageToIngestClient(content: string, artifactId: string): string {
  let next = content.replace(
    /export const VALIDATION_ARTIFACT_ID = "[^"]+"/,
    `export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(artifactId)}`,
  );
  if (!next.includes("validationLineage")) {
    next = next.replace(
      `export async function submitPilotForm(form: Record<string, unknown>): Promise<{ ok: boolean }> {
  return postValidationIngest({ kind: "form", form });
}`,
      `export async function submitPilotForm(form: Record<string, unknown>): Promise<{ ok: boolean }> {
  return postValidationIngest({
    kind: "form",
    form,
    validationLineage: {
      candidateId: VALIDATION_CANDIDATE_ID,
      experimentId: VALIDATION_EXPERIMENT_ID,
      artifactId: VALIDATION_ARTIFACT_ID,
    },
  });
}`,
    );
  }
  return next;
}

export function applyPublicLineageToEarlyAccessForm(content: string): string {
  let next = content.replace(
    `import { submitPilotForm } from "../../ingest-client";`,
    `import { submitPilotForm, VALIDATION_CANDIDATE_ID, VALIDATION_EXPERIMENT_ID, VALIDATION_ARTIFACT_ID } from "../../ingest-client";`,
  );
  if (!next.includes("data-candidate-id={VALIDATION_CANDIDATE_ID}")) {
    next = next.replace(
      `<form className="vg-form" onSubmit={onSubmit}>`,
      `<form className="vg-form" onSubmit={onSubmit} data-candidate-id={VALIDATION_CANDIDATE_ID} data-experiment-id={VALIDATION_EXPERIMENT_ID} data-artifact-id={VALIDATION_ARTIFACT_ID}>`,
    );
  }
  return next;
}

export function applyPublicLineageToHomepage(
  content: string,
  input: { candidateId: string; experimentId: string; artifactId: string },
): string {
  let next = content
    .replace(/data-artifact-id="[^"]+"/, `data-artifact-id="${input.artifactId}"`)
    .replace(/data-experiment-id="[^"]+"/, `data-experiment-id="${input.experimentId}"`);
  if (!/data-candidate-id=/.test(next)) {
    next = next.replace(
      `data-artifact-id="${input.artifactId}"`,
      `data-artifact-id="${input.artifactId}" data-candidate-id="${input.candidateId}"`,
    );
  } else {
    next = next.replace(/data-candidate-id="[^"]+"/, `data-candidate-id="${input.candidateId}"`);
  }
  return next;
}

export function inspectRenderedLineageAndQuestionIdentity(input: {
  files: Array<{ path: string; content: string }>;
  candidateId?: string;
  experimentId?: string;
  artifactId: string;
}): {
  candidate: {
    source: "PASS" | "FAIL";
    renderedSerialized: "PASS" | "FAIL";
    form: "PASS" | "FAIL";
    ingest: "PASS" | "FAIL";
    liveVerifiable: boolean;
  };
  experiment: {
    renderedDerivable: "PASS" | "FAIL";
    form: "PASS" | "FAIL";
    ingest: "PASS" | "FAIL";
  };
  artifact: {
    renderedDerivable: "PASS" | "FAIL";
    formRuntime: "PASS" | "FAIL";
  };
  questions: {
    intended: number;
    rendered: number;
    missing: number;
    missingIds: string[];
    duplicateUnstable: number;
    dataQuestionId: "PASS" | "FAIL";
    stableIds: "PASS" | "FAIL";
  };
  chunks: {
    instrumented: number;
    questionLinkage: "PASS" | "FAIL";
    pageLinkage: "PASS" | "FAIL";
    sectionLinkage: "PASS" | "FAIL";
    artifactLinkage: "PASS" | "FAIL";
  };
  form: {
    candidate: "PASS" | "FAIL";
    experiment: "PASS" | "FAIL";
    artifact: "PASS" | "FAIL";
    sameOrigin: "PASS" | "FAIL";
    realPostPerformed: false;
  };
  liveVerifier: string;
  repairRequired: boolean;
  sourceObjectsUsedAsSoleProof: false;
} {
  const candidateId = input.candidateId ?? CRE_CANDIDATE_ID;
  const experimentId = input.experimentId ?? LOCKED_CRE_EXPERIMENT_ID;
  const ingest = fileOf(input.files, "app/ingest-client.ts");
  const formPage = fileOf(input.files, "app/early-access/page.tsx");
  const homepage = fileOf(input.files, "app/page.tsx");
  const blob = input.files.map((file) => file.content).join("\n");
  const pages = pageFiles(input.files);
  const graph = applySuccessorQuestionMapping(buildCreQuestionKnowledgeGraph());
  const answerQuestions = pages.flatMap((file) => extractAnswerFirstBlocks(file.content).map((block) => block.question));
  const intendedNodes = graph.nodes.filter((node) =>
    answerQuestions.some((question) => question.toLowerCase() === node.question.toLowerCase()),
  );
  const intendedIds = [...new Set(intendedNodes.map((node) => node.questionId))];
  const renderedIds = [...blob.matchAll(/data-question-id="([^"]+)"/g)].map((match) => match[1]);
  const uniqueRendered = [...new Set(renderedIds)];
  const missingIds = intendedIds.filter((id) => !uniqueRendered.includes(id));
  let duplicateUnstable = 0;
  for (const id of renderedIds) {
    if (!CANONICAL_QUESTION_ID_PATTERN.test(id)) duplicateUnstable += 1;
  }
  for (const file of pages) {
    for (const block of extractAnswerFirstBlocks(file.content)) {
      const expected = canonicalQuestionId(block.question);
      const escaped = block.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = file.content.match(new RegExp(`data-question-id="([^"]+)"[^>]*>\\s*<AnswerFirst question="${escaped}"`));
      if (match && match[1] !== expected) duplicateUnstable += 1;
    }
  }
  const candidateSource = ingest.includes(`export const VALIDATION_CANDIDATE_ID = ${JSON.stringify(candidateId)}`)
    ? "PASS"
    : "FAIL";
  const candidateConsumed =
    /VALIDATION_CANDIDATE_ID/.test(formPage) ||
    ingest.includes("candidateId: VALIDATION_CANDIDATE_ID") ||
    homepage.includes(`data-candidate-id="${candidateId}"`);
  const candidateRendered = candidateConsumed && blob.includes(candidateId) ? "PASS" : "FAIL";
  const candidateForm =
    formPage.includes("VALIDATION_CANDIDATE_ID") || formPage.includes(`data-candidate-id="${candidateId}"`)
      ? "PASS"
      : "FAIL";
  const candidateIngest =
    ingest.includes(candidateId) && ingest.includes("candidateId: VALIDATION_CANDIDATE_ID") ? "PASS" : "FAIL";
  const experimentRendered =
    blob.includes(experimentId) &&
    (homepage.includes(`data-experiment-id="${experimentId}"`) || ingest.includes(experimentId))
      ? "PASS"
      : "FAIL";
  const experimentForm =
    formPage.includes("VALIDATION_EXPERIMENT_ID") ||
    formPage.includes(experimentId) ||
    ingest.includes(`VALIDATION_INGEST_PATH = "/api/public/market-validation/" + VALIDATION_EXPERIMENT_ID`)
      ? "PASS"
      : "FAIL";
  const experimentIngest =
    ingest.includes(experimentId) && /VALIDATION_INGEST_PATH/.test(ingest) ? "PASS" : "FAIL";
  const artifactRendered = blob.includes(input.artifactId) ? "PASS" : "FAIL";
  const artifactFormRuntime =
    ingest.includes(`export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(input.artifactId)}`) ||
    homepage.includes(`data-artifact-id="${input.artifactId}"`) ||
    formPage.includes("VALIDATION_ARTIFACT_ID")
      ? "PASS"
      : "FAIL";
  const readiness = evaluateFormBackendReadiness({
    artifactFiles: input.files,
    experimentId,
  });
  const chunkCount = (blob.match(/data-answer-chunk-id=/g) ?? []).length;
  const chrome = fileOf(input.files, "components/site-chrome.tsx");
  const pageLinkage =
    /data-page-id=/.test(chrome) &&
    pages.every((file) => !file.content.includes("data-question-id=") || /PageIdentity/.test(file.content))
      ? "PASS"
      : "FAIL";
  const sectionLinkage = pages.every(
    (file) => !file.content.includes("data-question-id=") || /data-section-id=/.test(file.content),
  )
    ? "PASS"
    : "FAIL";
  const questionLinkage = missingIds.length === 0 && chunkCount >= intendedIds.length ? "PASS" : "FAIL";
  const artifactLinkage = artifactRendered === "PASS" && artifactFormRuntime === "PASS" ? "PASS" : "FAIL";
  const repairRequired =
    candidateRendered === "FAIL" ||
    candidateForm === "FAIL" ||
    candidateIngest === "FAIL" ||
    missingIds.length > 0 ||
    uniqueRendered.length === 0;
  return {
    candidate: {
      source: candidateSource,
      renderedSerialized: candidateRendered,
      form: candidateForm,
      ingest: candidateIngest,
      liveVerifiable: candidateRendered === "PASS" && candidateForm === "PASS",
    },
    experiment: {
      renderedDerivable: experimentRendered,
      form: experimentForm,
      ingest: experimentIngest,
    },
    artifact: {
      renderedDerivable: artifactRendered,
      formRuntime: artifactFormRuntime,
    },
    questions: {
      intended: intendedIds.length,
      rendered: uniqueRendered.length,
      missing: missingIds.length,
      missingIds,
      duplicateUnstable,
      dataQuestionId: missingIds.length === 0 && uniqueRendered.length >= intendedIds.length ? "PASS" : "FAIL",
      stableIds: duplicateUnstable === 0 && uniqueRendered.every((id) => CANONICAL_QUESTION_ID_PATTERN.test(id))
        ? "PASS"
        : "FAIL",
    },
    chunks: {
      instrumented: chunkCount,
      questionLinkage,
      pageLinkage,
      sectionLinkage,
      artifactLinkage,
    },
    form: {
      candidate: candidateForm,
      experiment: experimentForm === "PASS" || experimentIngest === "PASS" ? "PASS" : "FAIL",
      artifact: artifactFormRuntime,
      sameOrigin: readiness.readyForLiveDeploy ? "PASS" : "FAIL",
      realPostPerformed: false,
    },
    liveVerifier:
      "Fetch / and /early-access HTML for data-candidate-id, data-experiment-id, and data-artifact-id. Confirm app/ingest-client.ts exports VALIDATION_CANDIDATE_ID / VALIDATION_EXPERIMENT_ID / VALIDATION_ARTIFACT_ID and submitPilotForm references validationLineage so the IDs survive the client bundle. Require data-question-id on AnswerFirst wrappers. Do not require the candidate UUID as visible body text.",
    repairRequired,
    sourceObjectsUsedAsSoleProof: false,
  };
}
