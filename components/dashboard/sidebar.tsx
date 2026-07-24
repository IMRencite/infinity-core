"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Opportunities", href: "/dashboard/opportunities" },
  { label: "Allocations", href: "/dashboard/allocations" },
  { label: "Assets", href: "/dashboard/assets" },
  { label: "Intelligence", href: "/dashboard/intelligence" },
  { label: "Organizations", href: "#", disabled: true },
  { label: "Initiatives", href: "#", disabled: true },
  { label: "Ventures", href: "#", disabled: true },
  { label: "Workers", href: "#", disabled: true },
  { label: "Activity", href: "#", disabled: true },
  { label: "Settings", href: "#", disabled: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 top-14 z-40 hidden w-44 flex-col border-r border-white/[0.05] bg-[#090909] lg:flex">
      <nav className="flex flex-1 flex-col gap-px overflow-y-auto p-2" aria-label="Dashboard">
        {navItems.map((item) => {
          const active = !item.disabled && isActive(pathname, item.href);

          if (item.disabled) {
            return (
              <span
                key={item.label}
                className="rounded-md px-2.5 py-2 text-[12px] font-medium text-zinc-700"
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors ${
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.05] px-3 py-3">
        <p className="text-[11px] font-medium text-zinc-500">Infinity HQ</p>
        <p className="text-[10px] text-zinc-700">Portfolio</p>
      </div>
    </aside>
  );
}
