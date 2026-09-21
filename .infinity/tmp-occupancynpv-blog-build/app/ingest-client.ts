export const VALIDATION_CANDIDATE_ID = "7e7e924e-0741-4155-a729-8d529da77ea9";
export const VALIDATION_EXPERIMENT_ID = "exp_e72beb7b6d35e7b20acf";
export const VALIDATION_ARTIFACT_ID = "art_c62f12bc59759bdbf3d1";
export const VALIDATION_INGEST_PATH = "/api/public/market-validation/" + VALIDATION_EXPERIMENT_ID + "/ingest";

export async function postValidationIngest(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
  const response = await fetch(VALIDATION_INGEST_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: response.ok };
}

export function captureLandingAttribution(): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landingTimestamp: string;
} {
  if (typeof window === "undefined") {
    return { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, landingTimestamp: new Date().toISOString() };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    referrer: document.referrer || null,
    landingTimestamp: new Date().toISOString(),
  };
}

export async function emitExperimentEvent(type: string): Promise<void> {
  await postValidationIngest({ kind: "event", type, ...captureLandingAttribution() });
}

export async function submitPilotForm(form: Record<string, unknown>): Promise<{ ok: boolean }> {
  return postValidationIngest({
    kind: "form",
    form,
    validationLineage: {
      candidateId: VALIDATION_CANDIDATE_ID,
      experimentId: VALIDATION_EXPERIMENT_ID,
      artifactId: VALIDATION_ARTIFACT_ID,
    },
  });
}
