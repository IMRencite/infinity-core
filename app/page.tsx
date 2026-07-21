const sidebarItems = [
  { label: "Command Center", icon: "command", active: true },
  { label: "Opportunities", icon: "opportunities", active: false },
  { label: "Companies", icon: "companies", active: false },
  { label: "Build", icon: "build", active: false },
  { label: "Agents", icon: "agents", active: false },
  { label: "Knowledge", icon: "knowledge", active: false },
  { label: "Growth", icon: "growth", active: false },
  { label: "Experiments", icon: "experiments", active: false },
  { label: "Analytics", icon: "analytics", active: false },
  { label: "Settings", icon: "settings", active: false },
];

const suggestedCommands = [
  "Build a SaaS",
  "Analyze Market",
  "Continue Project",
  "Grow Company",
  "Find Opportunities",
];

const ceoMetrics = [
  { label: "Portfolio Companies", value: "0" },
  { label: "Monthly Revenue", value: "$0" },
  { label: "Active Agents", value: "0" },
  { label: "Active Builds", value: "0" },
  { label: "Approvals Needed", value: "0" },
  { label: "Opportunities Found", value: "0" },
];

const missionStages = [
  "Research",
  "Validation",
  "Architecture",
  "Design",
  "Build",
  "QA",
  "Launch",
  "Growth",
];

const intelligenceBriefings = [
  { text: "No urgent portfolio issues", tone: "ok" as const },
  { text: "Opportunity engine ready", tone: "ready" as const },
  { text: "Memory Core offline", tone: "offline" as const },
  { text: "No builds currently running", tone: "neutral" as const },
  { text: "Waiting for first mission", tone: "neutral" as const },
];

const exampleConversations = [
  "Build an AI SaaS for Contractors",
  "Analyze the private aviation market",
  "Improve IMR's SEO strategy",
  "Continue the Art Marketplace",
];

const runningSystems = [
  { name: "Conversation Engine", status: "Prototype", tone: "ready" as const },
  { name: "Memory Core", status: "Offline", tone: "offline" as const },
  { name: "Opportunity Engine", status: "Ready", tone: "ready" as const },
  { name: "Build Engine", status: "Waiting", tone: "neutral" as const },
  { name: "Growth Engine", status: "Waiting", tone: "neutral" as const },
];

const portfolioActivity = [
  { text: "Infinity Core foundation created", status: "Completed", tone: "success" as const },
  { text: "Infinity HQ interface created", status: "Completed", tone: "success" as const },
  { text: "Conversation Engine", status: "Queued", tone: "queued" as const },
  { text: "Supabase connection", status: "Recommended", tone: "ready" as const },
  { text: "Opportunity Intelligence", status: "Not Started", tone: "pending" as const },
];

const statusDot = {
  ok: "bg-emerald-500/75",
  ready: "bg-sky-400/70",
  neutral: "bg-zinc-500/55",
  offline: "bg-zinc-600/65",
  online: "bg-emerald-400/80",
};

const activityBadge = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400/90",
  queued: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
  ready: "border-sky-500/20 bg-sky-500/10 text-sky-400/90",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-400/90",
};

function SearchIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function SidebarIcon({ name }: { name: string }) {
  const className = "h-[15px] w-[15px] shrink-0";

  switch (name) {
    case "command":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case "opportunities":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "companies":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      );
    case "build":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      );
    case "agents":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case "knowledge":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      );
    case "growth":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    case "experiments":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.611L5 14.5" />
        </svg>
      );
    case "analytics":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function Card({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "emphasis" | "accent" | "subtle";
}) {
  const styles = {
    default: "border-white/[0.06] bg-[#0b0b0b]",
    emphasis: "border-white/[0.09] bg-[#0d0d0d]",
    accent: "border-sky-500/20 bg-[#0c0c0c] shadow-[0_0_0_1px_rgba(56,189,248,0.04)_inset]",
    subtle: "border-white/[0.04] bg-transparent",
  };

  return (
    <section className={`rounded-xl border p-4 sm:p-5 ${styles[variant]} ${className}`}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
      {children}
    </h2>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-zinc-100">
      {/* Top Navigation */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-5 lg:gap-8">
            <div className="shrink-0 leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-white">Infinity</p>
              <p className="hidden text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600 sm:block">
                Venture Operating System
              </p>
            </div>

            <div className="relative hidden min-w-0 md:block md:w-52 lg:w-64 xl:w-72">
              <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
                <SearchIcon />
              </div>
              <input
                type="search"
                placeholder="Search companies, opportunities, projects, knowledge..."
                aria-label="Global search"
                className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] py-1.5 pl-8 pr-3 text-[13px] text-zinc-400 placeholder:text-zinc-700 outline-none"
                readOnly
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <div
              className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 sm:flex"
              aria-label="Infinity status: Idle"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot.neutral}`} aria-hidden />
              <span className="text-[11px] font-medium tracking-wide text-zinc-400">Idle</span>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] transition-colors hover:bg-white/[0.03]"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-zinc-800/80 text-[11px] font-medium text-zinc-400"
              aria-label="User avatar for Anthony"
            >
              A
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 top-14 z-40 hidden w-44 flex-col border-r border-white/[0.05] bg-[#090909] xl:flex">
          <nav className="flex flex-1 flex-col gap-px overflow-y-auto p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
                  item.active
                    ? "bg-white/[0.06] text-white"
                    : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                }`}
              >
                <SidebarIcon name={item.icon} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="border-t border-white/[0.05] px-3 py-3">
            <p className="text-[11px] font-medium text-zinc-500">Infinity HQ</p>
            <p className="text-[10px] text-zinc-700">Version 0.5</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 xl:ml-44">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
            {/* Mobile nav */}
            <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 xl:hidden" aria-label="Navigation">
              {sidebarItems.slice(0, 5).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${
                    item.active ? "bg-white/[0.07] text-white" : "text-zinc-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Hero + Command */}
            <header className="mb-5">
              <p className="text-[13px] text-zinc-500">Good evening, Anthony.</p>
              <p className="mt-1 text-[12px] text-zinc-600">
                Infinity is idle and awaiting its next mission.
              </p>
              <h1 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2.125rem]">
                What are we building today?
              </h1>
            </header>

            <section className="mb-6" aria-label="AI command workspace">
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d0d]">
                <div className="px-4 py-3 sm:px-5">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Command
                  </p>
                  <label htmlFor="infinity-command" className="sr-only">
                    Command Infinity
                  </label>
                  <textarea
                    id="infinity-command"
                    rows={2}
                    placeholder="What would you like Infinity to build, research, analyze, or improve today?"
                    className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none sm:text-base"
                    readOnly
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-white/[0.05] px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {suggestedCommands.map((command) => (
                      <button
                        key={command}
                        type="button"
                        className="rounded-full px-2.5 py-1 text-[10px] text-zinc-600 transition-colors hover:text-zinc-400"
                      >
                        {command}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
                  >
                    Start Thinking
                  </button>
                </div>
              </div>
            </section>

            {/* Current Mission */}
            <Card className="mb-6" variant="emphasis">
              <SectionLabel>Current Mission</SectionLabel>
              <p className="text-[17px] font-medium text-white">No active mission.</p>
              <p className="mt-1 text-[13px] text-zinc-500">
                Ask Infinity to research, validate, and build your first company.
              </p>

              <div className="mt-5 overflow-x-auto pb-1">
                <div className="flex min-w-max items-start">
                  {missionStages.map((stage, index) => (
                    <div key={stage} className="flex items-start">
                      <div className="flex w-[4.5rem] flex-col items-center sm:w-20">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-[#0a0a0a]">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" aria-hidden />
                        </div>
                        <span className="mt-2 text-center text-[10px] font-medium tracking-wide text-zinc-500">
                          {stage}
                        </span>
                      </div>
                      {index < missionStages.length - 1 && (
                        <div
                          className="mx-0.5 mt-[18px] h-px w-4 bg-white/[0.1] sm:mx-1 sm:w-7"
                          aria-hidden
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-5 border-t border-white/[0.05] pt-4 text-[12px] text-zinc-600">
                Mission status updates will appear here once Infinity begins working.
              </p>
              <button
                type="button"
                className="mt-4 rounded-md border border-white/[0.08] px-3.5 py-1.5 text-[12px] font-medium text-zinc-500 transition-colors hover:border-white/[0.12] hover:text-zinc-300"
              >
                Start First Mission
              </button>
            </Card>

            {/* CEO Snapshot */}
            <section className="mb-6">
              <SectionLabel>CEO Snapshot</SectionLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {ceoMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-white/[0.04] px-2.5 py-2"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-600">
                      {metric.label}
                    </p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight text-white">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended Next Action */}
            <Card className="mb-6" variant="accent">
              <SectionLabel>Recommended Next Action</SectionLabel>
              <p className="max-w-2xl text-[14px] leading-relaxed text-zinc-400">
                Connect Supabase so Infinity can securely store users, companies, projects,
                conversations, decisions, experiments, prompts, and long-term memory.
              </p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Connect Memory Core
              </button>
            </Card>

            {/* Two-column: Intelligence + Running Systems */}
            <div className="mb-6 grid gap-5 lg:grid-cols-2">
              <Card variant="subtle">
                <SectionLabel>Today&apos;s Intelligence</SectionLabel>
                <ul className="space-y-2.5">
                  {intelligenceBriefings.map((item) => (
                    <li key={item.text} className="flex items-center gap-2.5 text-[13px] text-zinc-400">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[item.tone]}`}
                        aria-hidden
                      />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card variant="subtle">
                <SectionLabel>Running Systems</SectionLabel>
                <ul className="divide-y divide-white/[0.04]">
                  {runningSystems.map((system) => (
                    <li
                      key={system.name}
                      className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusDot[system.tone]}`}
                          aria-hidden
                        />
                        <span className="text-[13px] text-zinc-400">{system.name}</span>
                      </div>
                      <span className="text-[11px] text-zinc-600">{system.status}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Example Conversations */}
            <Card className="mb-6" variant="subtle">
              <SectionLabel>Example Conversations</SectionLabel>
              <ul className="divide-y divide-white/[0.04]">
                {exampleConversations.map((conversation) => (
                  <li key={conversation}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
                    >
                      <span className="min-w-0 truncate text-[13px] text-zinc-500">
                        {conversation}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-700">
                        Example
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recent Activity */}
            <Card variant="subtle">
              <SectionLabel>Recent Activity</SectionLabel>
              <ol>
                {portfolioActivity.map((item, index) => (
                  <li key={item.text} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < portfolioActivity.length - 1 && (
                      <span
                        className="absolute left-[4px] top-2.5 h-[calc(100%-6px)] w-px bg-white/[0.05]"
                        aria-hidden
                      />
                    )}
                    <span
                      className="relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full border border-white/[0.08] bg-[#0a0a0a]"
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[13px] text-zinc-500">{item.text}</span>
                      <span
                        className={`w-fit shrink-0 rounded border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${activityBadge[item.tone]}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
