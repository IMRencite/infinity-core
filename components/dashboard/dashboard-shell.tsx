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
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-zinc-100">
      <Topbar userEmail={userEmail} />
      <div className="flex pt-14">
        <Sidebar />
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 lg:ml-44">
          <div className="mx-auto w-full max-w-[100rem] px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
