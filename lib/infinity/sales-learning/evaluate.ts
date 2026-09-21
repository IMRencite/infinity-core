import type { SalesSkillId, SalesSkillState } from "./contract";
import { emptySkillProfile } from "./store";
import type { SalesAgentSkillProfile, SalesInteractionObservation, SkillEvidence, StageClassification } from "./types";

export function classifySalesStage(observation: Pick<SalesInteractionObservation, "turns" | "questions" | "objections" | "qualification_signals" | "commitments" | "outcome">): StageClassification {
  const actions = observation.turns.map((row) => row.action);
  const evidence: string[] = [];
  if (observation.outcome === "COMPLETE" || observation.commitments.includes("closed")) {
    return { stage: "COMPLETE", confidence: 0.8, evidence: ["outcome_complete"] };
  }
  const objectionActions = actions.some((row) =>
    row === "object" ||
    row === "respond_objection" ||
    row === "clarify_objection" ||
    row === "isolate_objection" ||
    row === "discount"
  );
  if (observation.objections.length || objectionActions) {
    evidence.push(observation.objections.length ? "objection_present" : "objection_action");
    return { stage: "OBJECTION", confidence: observation.objections.length ? 0.82 : 0.7, evidence };
  }
  if (actions.includes("ask_close") || observation.commitments.length) {
    return { stage: "CLOSE", confidence: 0.78, evidence: ["close_ask"] };
  }
  if (actions.includes("align_venture") || actions.includes("present_offer")) {
    return { stage: "VENTURE_ALIGNMENT", confidence: 0.74, evidence: ["venture_or_offer"] };
  }
  if (observation.qualification_signals.length) {
    return { stage: "QUALIFICATION", confidence: 0.76, evidence: observation.qualification_signals };
  }
  if (actions.includes("ask_desired_state")) return { stage: "DESIRED_STATE", confidence: 0.7, evidence: ["desired_state_question"] };
  if (actions.includes("ask_consequence")) return { stage: "CONSEQUENCE", confidence: 0.7, evidence: ["consequence_question"] };
  if (actions.includes("ask_problem")) return { stage: "PROBLEM", confidence: 0.72, evidence: ["problem_question"] };
  if (observation.questions.length || actions.includes("ask_discovery")) {
    return { stage: "DISCOVERY", confidence: 0.8, evidence: ["discovery_questions"] };
  }
  if (actions.includes("follow_up")) return { stage: "FOLLOW_UP", confidence: 0.7, evidence: ["follow_up"] };
  return { stage: "OPEN", confidence: 0.55, evidence: ["insufficient_stage_evidence"] };
}

function stateFromScore(score: number, sample: number): SalesSkillState {
  if (sample < 1) return "UNASSESSED";
  if (score < 0.45) return "DEVELOPING";
  if (score < 0.7) return "COMPETENT";
  if (score < 0.88) return "STRONG";
  return "EXPERT";
}

function pushEvidence(profile: SalesAgentSkillProfile, skill: SalesSkillId, observation: string, interactionId: string, at: string) {
  profile.dimensions[skill].evidence = [
    ...profile.dimensions[skill].evidence.slice(-7),
    { observation, interaction_id: interactionId, at },
  ];
}

export function evaluateInteractionSkills(input: {
  profile: SalesAgentSkillProfile;
  observation: SalesInteractionObservation;
  now: string;
}): SalesAgentSkillProfile {
  const obs = input.observation;
  const profile = input.profile;
  const actions = obs.turns.map((row) => row.action);
  const updates: Array<{ skill: SalesSkillId; score: number; note: string }> = [];

  const discoveryScore = obs.pitched_before_discovery ? 0.2 : obs.questions.length >= 2 ? 0.86 : obs.questions.length ? 0.62 : 0.35;
  updates.push({ skill: "DISCOVERY", score: discoveryScore, note: obs.pitched_before_discovery ? "pitched before discovery" : `${obs.questions.length} discovery questions` });
  updates.push({ skill: "QUESTION_QUALITY", score: obs.questions.some((row) => /why|impact|happen if|cost of/.test(row.toLowerCase())) ? 0.84 : obs.questions.length ? 0.55 : 0.3, note: "question quality from wording" });
  updates.push({ skill: "PROBLEM_IDENTIFICATION", score: actions.includes("ask_problem") && !obs.invented_problem ? 0.8 : obs.invented_problem ? 0.15 : 0.4, note: obs.invented_problem ? "invented prospect problem" : "problem identification" });
  updates.push({ skill: "CONSEQUENCE_DEVELOPMENT", score: actions.includes("ask_consequence") ? 0.82 : 0.38, note: actions.includes("ask_consequence") ? "asked consequence" : "no consequence question" });
  updates.push({ skill: "QUALIFICATION", score: obs.skipped_qualification ? 0.18 : obs.qualification_signals.length ? 0.8 : 0.42, note: obs.skipped_qualification ? "skipped qualification" : "qualification signals" });
  const isolated = actions.includes("isolate_objection") || actions.includes("clarify_objection");
  const responded = actions.includes("respond_objection") || actions.includes("discount");
  updates.push({ skill: "OBJECTION_CLARIFICATION", score: isolated ? 0.84 : obs.objections.length ? 0.25 : 0.5, note: isolated ? "clarified or isolated objection" : "objection ended before clarification" });
  updates.push({ skill: "OBJECTION_RESOLUTION", score: obs.objections.length ? (isolated && responded && !actions.includes("discount") ? 0.8 : 0.22) : 0.5, note: actions.includes("discount") ? "moved to discounting too early" : "objection handling sequence" });
  updates.push({ skill: "CLOSING", score: actions.includes("ask_close") && !obs.skipped_qualification ? 0.78 : actions.includes("ask_close") ? 0.3 : 0.4, note: "close ask vs qualification" });
  updates.push({ skill: "FOLLOW_UP", score: actions.includes("follow_up") && !actions.includes("instant_reply") ? 0.76 : actions.includes("instant_reply") ? 0.28 : 0.45, note: "follow-up pacing" });
  updates.push({ skill: "VENTURE_ALIGNMENT", score: obs.wrong_venture_alignment ? 0.2 : actions.includes("align_venture") ? 0.8 : 0.5, note: "venture alignment" });
  updates.push({ skill: "PERSONALIZATION", score: obs.used_known_context ? 0.84 : 0.4, note: obs.used_known_context ? "used known prospect context" : "did not use known context" });
  updates.push({ skill: "COMPLIANCE", score: obs.continued_after_suppression || obs.unsupported_claim ? 0.05 : 0.9, note: obs.continued_after_suppression ? "continued after suppression" : "compliance held" });
  updates.push({ skill: "ACCURACY", score: obs.unsupported_claim ? 0.1 : 0.85, note: obs.unsupported_claim ? "unsupported claim" : "approved claims only" });
  updates.push({ skill: "LISTENING", score: obs.repeated_known_question ? 0.25 : 0.75, note: obs.repeated_known_question ? "repeated a known question" : "did not re-ask known facts" });

  for (const update of updates) {
    const dim = profile.dimensions[update.skill];
    const previous = dim.score ?? update.score;
    dim.sample_size += 1;
    dim.score = Number((((dim.score ?? update.score) * (dim.sample_size - 1) + update.score) / dim.sample_size).toFixed(3));
    dim.confidence = Number(Math.min(0.95, 0.25 + dim.sample_size * 0.12).toFixed(3));
    dim.state = stateFromScore(dim.score, dim.sample_size);
    dim.trend = dim.score > previous + 0.05 ? "UP" : dim.score < previous - 0.05 ? "DOWN" : "FLAT";
    dim.last_evaluated_at = input.now;
    pushEvidence(profile, update.skill, update.note, obs.id, input.now);
  }
  profile.updated_at = input.now;
  return profile;
}

export function ensureProfile(profiles: Record<string, SalesAgentSkillProfile>, agentId: string, now: string): SalesAgentSkillProfile {
  if (!profiles[agentId]) profiles[agentId] = emptySkillProfile(agentId, now);
  return profiles[agentId]!;
}

export function skillEvidenceSummary(profile: SalesAgentSkillProfile, skill: SalesSkillId): SkillEvidence[] {
  return profile.dimensions[skill].evidence;
}

export function methodAdherenceFailures(observation: SalesInteractionObservation): string[] {
  const reasons: string[] = [];
  if (observation.pitched_before_discovery) reasons.push("PITCHED_BEFORE_DISCOVERY");
  if (observation.skipped_qualification) reasons.push("SKIPPED_QUALIFICATION");
  if (observation.invented_problem) reasons.push("INVENTED_PROSPECT_PROBLEM");
  if (observation.ignored_known_objection) reasons.push("IGNORED_KNOWN_OBJECTION");
  if (observation.repeated_known_question) reasons.push("REPEATED_KNOWN_QUESTION");
  if (observation.unsupported_claim) reasons.push("UNSUPPORTED_CLAIM");
  if (observation.wrong_venture_alignment) reasons.push("WRONG_VENTURE_ALIGNMENT");
  if (observation.continued_after_suppression) reasons.push("CONTINUED_AFTER_SUPPRESSION");
  return reasons;
}

export function inferObservationFlags(input: {
  turns: SalesInteractionObservation["turns"];
  questions: string[];
  known_questions?: string[];
  known_objections?: string[];
  suppressed?: boolean;
  used_known_context?: boolean;
  invented_problem?: boolean;
  unsupported_claim?: boolean;
  wrong_venture?: boolean;
}): Pick<SalesInteractionObservation, "pitched_before_discovery" | "skipped_qualification" | "invented_problem" | "ignored_known_objection" | "repeated_known_question" | "unsupported_claim" | "wrong_venture_alignment" | "continued_after_suppression" | "used_known_context"> {
  const actions = input.turns.map((row) => row.action);
  const firstPitch = actions.findIndex((row) => row === "present_offer" || row === "pitch");
  const firstQuestion = actions.findIndex((row) => row.startsWith("ask_"));
  const close = actions.includes("ask_close");
  const qualified = input.turns.some((row) => row.action === "qualify") || input.turns.some((row) => /authority|budget|decision/.test(row.text.toLowerCase()));
  return {
    pitched_before_discovery: firstPitch >= 0 && (firstQuestion < 0 || firstPitch < firstQuestion),
    skipped_qualification: close && !qualified,
    invented_problem: Boolean(input.invented_problem),
    ignored_known_objection: Boolean(input.known_objections?.length && !actions.some((row) => row.includes("objection"))),
    repeated_known_question: Boolean(input.known_questions?.some((row) => input.questions.includes(row))),
    unsupported_claim: Boolean(input.unsupported_claim),
    wrong_venture_alignment: Boolean(input.wrong_venture),
    continued_after_suppression: Boolean(input.suppressed && actions.some((row) => row === "ask_close" || row === "present_offer" || row === "follow_up")),
    used_known_context: Boolean(input.used_known_context),
  };
}
