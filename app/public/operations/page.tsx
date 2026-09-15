import { projectPublicOperations, publicOperationsPreviewModel } from "@/lib/infinity/public-operations-projection";

export const dynamic = "force-dynamic";

export default function PublicOperationsPreviewPage() {
  const projection = projectPublicOperations({ useCache: true });
  const preview = publicOperationsPreviewModel(projection);
  return (
    <main
      className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-zinc-200"
      data-public-operations-preview="true"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Public operations</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">{preview.title}</h1>
      <p className="mt-2 text-sm text-zinc-400" data-public-system-status>
        {preview.system_status}
      </p>
      <section className="mt-8 grid gap-3">
        {preview.departments.map((row) => (
          <div key={row.name} className="rounded-lg border border-zinc-800 px-4 py-3">
            <p className="text-sm font-medium text-white">{row.name}</p>
            <p className="text-sm text-zinc-400">{row.activity}</p>
          </div>
        ))}
      </section>
      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-zinc-500">Agents Active</dt>
          <dd data-public-agents-active>{preview.agents_active}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Ventures Started</dt>
          <dd data-public-ventures-started>{preview.ventures_started}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Ventures Operating</dt>
          <dd data-public-ventures-operating>{preview.ventures_operating}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Missions Completed</dt>
          <dd data-public-missions-completed>{preview.missions_completed}</dd>
        </div>
      </dl>
      <p className="mt-8 text-xs text-zinc-600" data-public-last-updated>
        Last Updated: {preview.last_updated}
      </p>
    </main>
  );
}
