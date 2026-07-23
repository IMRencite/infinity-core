import { logout } from "@/app/dashboard/actions";

export function Topbar({ userEmail }: { userEmail: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-5">
        <div className="shrink-0 leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-white">
            Infinity
          </p>
          <p className="hidden text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600 sm:block">
            Autonomous Venture Operating System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden max-w-[16rem] truncate text-[13px] text-zinc-400 sm:block">
            {userEmail}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-white"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
