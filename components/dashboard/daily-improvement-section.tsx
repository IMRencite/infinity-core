import type { DailyImprovementHqView } from "@/lib/infinity/daily-improvement-engine";

export function DailyImprovementSection({ view }: { view: DailyImprovementHqView }) {
  const report = view.cycle.report;
  return (
    <section aria-label="Daily Improvement" data-hq-daily-improvement className="mt-10">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        Daily Improvement
      </h2>
      <p className="mt-2 text-[13px] text-zinc-500">
        Cross-system meta-engine. Observes, benchmarks, and routes improvements back to the owning system.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Leading", report.leading],
          ["On Standard", report.on_standard],
          ["Slightly Behind", report.slightly_behind],
          ["Material Gaps", report.material_gaps],
          ["Critical Gaps", report.critical_gaps],
          ["Unknown", report.unknown],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {view.sections.map((section) => (
          <article key={section.id} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-4 py-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{section.title}</h3>
            {section.items.length ? (
              <ul className="mt-3 space-y-1.5">
                {section.items.slice(0, 8).map((item) => (
                  <li key={item} className="text-[13px] text-zinc-300">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-zinc-600">None recorded this cycle.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
