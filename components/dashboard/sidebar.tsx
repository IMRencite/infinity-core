const navItems = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Organizations", href: "#", active: false },
  { label: "Projects", href: "#", active: false },
  { label: "Companies", href: "#", active: false },
  { label: "AI Agents", href: "#", active: false },
  { label: "Activity", href: "#", active: false },
  { label: "Settings", href: "#", active: false },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 top-14 z-40 hidden w-44 flex-col border-r border-white/[0.05] bg-[#090909] lg:flex">
      <nav className="flex flex-1 flex-col gap-px overflow-y-auto p-2" aria-label="Dashboard">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors ${
              item.active
                ? "bg-white/[0.06] text-white"
                : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="border-t border-white/[0.05] px-3 py-3">
        <p className="text-[11px] font-medium text-zinc-500">Infinity HQ</p>
        <p className="text-[10px] text-zinc-700">Dashboard</p>
      </div>
    </aside>
  );
}
