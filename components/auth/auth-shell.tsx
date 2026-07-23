export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-12 font-sans text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[15px] font-semibold tracking-tight text-white">
            Infinity
          </p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600">
            Autonomous Venture Operating System
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-lg font-medium tracking-tight text-white">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
