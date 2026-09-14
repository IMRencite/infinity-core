import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hq-dashboard-shell min-h-screen max-w-full bg-[#0a0a0a] font-sans text-zinc-100">
      <Topbar userEmail={userEmail} />
      <div className="hq-dashboard-shell-row flex min-w-0 max-w-full pt-14">
        <Sidebar />
        <main className="hq-dashboard-main min-h-[calc(100vh-3.5rem)] min-w-0 max-w-full flex-1 lg:ml-44">
          <div className="hq-dashboard-main-inner mx-auto w-full min-w-0 max-w-[min(100rem,100%)] px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
