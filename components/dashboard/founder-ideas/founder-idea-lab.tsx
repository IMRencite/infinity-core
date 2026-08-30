"use client";

import { useActionState, useState } from "react";
import type { HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { analyzeFounderIdeaAction, decideFounderIdeaAction, reanalyzeFounderIdeaAction, type FounderIdeaActionState } from "@/app/dashboard/founder-ideas/actions";
import type { FounderIdeaListRow } from "@/lib/infinity/founder-idea-lab/hq/artifacts";
import type { FounderAction } from "@/lib/infinity/founder-idea-lab/constants";

type DecisionView = {
  id: string;
  infinityDecision: string;
  founderDecision: string;
  origin: string;
  status: string;
  actions: FounderAction[];
  blockingAssumptions: string[];
  plannedValidation: string[];
  expectedCostUsd: number | null;
  expectedInformationGain: string[];
};

type Props = {
  rows: FounderIdeaListRow[];
  decisions: Record<string, DecisionView>;
  details: Record<string, { artifact: HqWorkArtifact; detail: HQEntityDetail }>;
};

const INITIAL: FounderIdeaActionState = { ok: true, message: "" };

const ACTION_LABELS: Record<FounderAction, string> = {
  BUILD_THIS_BUSINESS: "Build this business",
  VALIDATE_MORE: "Validate more",
  HOLD: "Hold",
  REJECT: "Reject",
  BUILD_ANYWAY: "Build anyway",
  REASSESS: "Reassess",
  REANALYZE: "Reanalyze",
  REVIEW_REASONS: "Review reasons",
  ACCEPT_REJECT: "Accept reject",
};

export function FounderIdeaLab({ rows, decisions, details }: Props) {
  const [analyzeState, analyzeAction, analyzing] = useActionState(analyzeFounderIdeaAction, INITIAL);
  const [decideState, decideAction, deciding] = useActionState(decideFounderIdeaAction, INITIAL);
  const [reanalyzeState, reanalyzeAction, reanalyzing] = useActionState(reanalyzeFounderIdeaAction, INITIAL);
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const selected = selectedId ? decisions[selectedId] : null;
  const selectedRow = selectedId ? rows.find((row) => row.id === selectedId) : null;
  const selectedDetail = selectedId ? details[selectedId] : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden border border-zinc-700/35 bg-gradient-to-b from-zinc-950/80 to-[#080808] px-5 py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_60%)]" aria-hidden />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Founder Idea Lab</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[0.08em] text-white">Submit an idea</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Infinity grades founder ideas through the canonical opportunity, research, monetization, and selection path. Founder
            approval does not bypass Treasury.
          </p>
        </div>
        <form action={analyzeAction} className="relative mt-5 grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Idea name
            <input
              required
              name="title"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="md:col-span-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Describe the idea
            <textarea
              required
              name="description"
              rows={4}
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Target customer
            <input name="targetCustomer" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
          </label>
          <label className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Problem
            <input name="problem" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
          </label>
          <label className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            How it makes money
            <input name="businessModelHypothesis" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
          </label>
          <label className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Pricing idea
            <input name="pricingHypothesis" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
          </label>
          <label className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Known competitors
            <input name="competitors" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
          </label>
          <label className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Notes
            <input name="notes" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
          </label>
          <fieldset className="md:col-span-2">
            <legend className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Mode</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                <input type="radio" name="desiredMode" value="GRADE_ONLY" defaultChecked />
                Grade only
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="desiredMode" value="GRADE_AND_VALIDATE" />
                Grade + validate
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="desiredMode" value="GRADE_AND_BUILD_IF_READY" />
                Grade + build if ready
              </label>
            </div>
          </fieldset>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={analyzing}
              className="rounded-md border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100"
            >
              {analyzing ? "Analyzing…" : "Analyze Idea"}
            </button>
            {analyzeState.message ? (
              <p className={`mt-2 text-xs ${analyzeState.ok ? "text-zinc-500" : "text-amber-200"}`}>{analyzeState.message}</p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-3" aria-label="Founder ideas">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Submitted ideas</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs text-zinc-300">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="pb-2 font-medium">Idea</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Infinity Decision</th>
                <th className="pb-2 font-medium">Founder Decision</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Venture</th>
                <th className="pb-2 font-medium">Revenue</th>
                <th className="pb-2 font-medium">Profit</th>
                <th className="pb-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-zinc-600">
                    No founder ideas yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-t border-zinc-800/80 ${selectedId === row.id ? "bg-sky-500/10" : ""}`}
                    onClick={() => {
                      setSelectedId(row.id);
                    }}
                  >
                    <td className="py-2">{row.idea}</td>
                    <td>{row.score}</td>
                    <td>{row.infinityDecision}</td>
                    <td>{row.founderDecision}</td>
                    <td>{row.status}</td>
                    <td>{row.venture}</td>
                    <td>{row.revenue}</td>
                    <td>{row.profit}</td>
                    <td>{row.submitted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <section className="border border-zinc-800/70 bg-zinc-950/60 px-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Infinity recommendation</p>
              <p className="mt-1 text-lg font-semibold text-sky-100">{selected.infinityDecision}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Your decision</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">{selected.founderDecision}</p>
              {selected.origin === "FOUNDER_OVERRIDE" ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-200">Founder override</p>
              ) : null}
            </div>
          </div>
          {selected.status === "VALIDATING" || selected.infinityDecision === "VALIDATE" ? (
            <div className="mt-4 grid gap-2 text-xs text-zinc-400">
              <p>Blocking assumptions: {selected.blockingAssumptions.join("; ") || "UNKNOWN"}</p>
              <p>Planned validation: {selected.plannedValidation.join("; ") || "UNKNOWN"}</p>
              <p>Expected cost: {selected.expectedCostUsd != null ? `$${selected.expectedCostUsd} ESTIMATE` : "UNKNOWN"} — Treasury rules apply</p>
              <p>Expected information gain: {selected.expectedInformationGain.join("; ")}</p>
            </div>
          ) : null}
          <form action={decideAction} className="mt-4 space-y-3">
            <input type="hidden" name="submissionId" value={selected.id} />
            <label className="block text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Why (optional)
              <input name="reason" className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" name="riskAcknowledged" />
              Risk acknowledged for BUILD ANYWAY
            </label>
            <div className="flex flex-wrap gap-2">
              {selected.actions.map((action) => (
                <button
                  key={action}
                  type="submit"
                  name="action"
                  value={action}
                  disabled={deciding}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-200 hover:border-sky-500/40 hover:text-sky-100"
                >
                  {ACTION_LABELS[action]}
                </button>
              ))}
            </div>
            {decideState.message ? (
              <p className={`text-xs ${decideState.ok ? "text-zinc-500" : "text-amber-200"}`}>{decideState.message}</p>
            ) : null}
          </form>
          <form action={reanalyzeAction} className="mt-3">
            <input type="hidden" name="submissionId" value={selected.id} />
            <input type="hidden" name="analysisAttempt" value={selectedRow?.reanalysisAttempt ?? 1} />
            <button
              type="submit"
              disabled={reanalyzing}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-200 hover:border-sky-500/40 hover:text-sky-100"
            >
              {reanalyzing ? "Reanalyzing…" : ACTION_LABELS.REANALYZE}
            </button>
            {reanalyzeState.message ? (
              <p className={`mt-2 text-xs ${reanalyzeState.ok ? "text-zinc-500" : "text-amber-200"}`}>{reanalyzeState.message}</p>
            ) : null}
          </form>
        </section>
      ) : null}

      {selectedDetail ? (
        <section className="border border-zinc-800/70 bg-zinc-950/60" aria-label="Founder idea intelligence">
          <HQOutputDetail detail={selectedDetail.detail} artifact={selectedDetail.artifact} />
        </section>
      ) : null}
    </div>
  );
}
