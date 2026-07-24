import Link from "next/link";
import type {
  EvidenceRecord,
  IntelligenceSummary,
  Lesson,
} from "@/lib/infinity/intelligence";

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: EvidenceRecord }) {
  return (
    <li className="border-t border-white/[0.04] py-2 first:border-t-0 first:pt-0">
      <p className="text-[13px] font-medium text-zinc-200">
        {evidence.title ?? evidence.evidence_type.replaceAll("_", " ")}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-600">
        {evidence.evidence_type.replaceAll("_", " ")} ·{" "}
        {new Date(evidence.captured_at).toLocaleString()}
      </p>
    </li>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  return (
    <li className="border-t border-white/[0.04] py-2 first:border-t-0 first:pt-0">
      <p className="text-[13px] font-medium text-zinc-200">{lesson.title}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">{lesson.lesson}</p>
    </li>
  );
}

export function IntelligencePortfolioSection({
  summary,
  recentEvidence,
  recentLessons,
}: {
  summary: IntelligenceSummary;
  recentEvidence: EvidenceRecord[];
  recentLessons: Lesson[];
}) {
  const isEmpty =
    summary.evidenceCount === 0 &&
    summary.claimCount === 0 &&
    summary.memoryCount === 0;

  return (
    <section aria-label="Intelligence" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Institutional intelligence
        </h2>
        <Link
          href="/dashboard/intelligence"
          className="text-[11px] font-medium text-zinc-500 transition hover:text-zinc-300"
        >
          View all
        </Link>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
        {isEmpty ? (
          <p className="text-[13px] leading-relaxed text-zinc-500">
            No institutional intelligence yet. When the deterministic discovery
            runtime completes, system-validation evidence and memory are recorded
            here. Real market observation, external research, and AI synthesis
            remain future work.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryMetric label="Evidence" value={String(summary.evidenceCount)} />
              <SummaryMetric label="Claims" value={String(summary.claimCount)} />
              <SummaryMetric
                label="Supported claims"
                value={String(summary.supportedClaims)}
              />
              <SummaryMetric
                label="Contradicted claims"
                value={String(summary.contradictedClaims)}
              />
              <SummaryMetric
                label="Active knowledge"
                value={String(summary.activeKnowledgeCount)}
              />
              <SummaryMetric label="Memories" value={String(summary.memoryCount)} />
              <SummaryMetric
                label="Active lessons"
                value={String(summary.activeLessonCount)}
              />
              <SummaryMetric
                label="Active procedures"
                value={String(summary.activeProcedureCount)}
              />
            </div>

            {recentEvidence.length > 0 ? (
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Recent evidence
                </h3>
                <ul className="mt-2">
                  {recentEvidence.slice(0, 5).map((evidence) => (
                    <EvidenceRow key={evidence.id} evidence={evidence} />
                  ))}
                </ul>
              </div>
            ) : null}

            {recentLessons.length > 0 ? (
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Recent lessons
                </h3>
                <ul className="mt-2">
                  {recentLessons.slice(0, 3).map((lesson) => (
                    <LessonRow key={lesson.id} lesson={lesson} />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
