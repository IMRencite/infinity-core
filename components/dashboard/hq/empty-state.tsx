type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = "No data yet" }: EmptyStateProps) {
  return <p className="px-4 py-5 text-[13px] text-zinc-500">{message}</p>;
}

export function HqSection({
  title,
  subtitle,
  children,
  id,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-[13px] font-medium text-zinc-200">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[12px] text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
