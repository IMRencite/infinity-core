import "../hq-live-activity.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isLocalHqObservabilityProofSession } from "@/lib/infinity/operator-console/local-hq-proof";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (process.env.AUTH_DEBUG === "true") {
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    const authCookieNames = cookieStore
      .getAll()
      .map((cookie) => cookie.name)
      .filter((name) => name.includes("-auth-token"));
    console.info(
      `[AUTH] dashboard layout getUser authenticated=${Boolean(user)} cookieNames=[${authCookieNames.join(", ")}]`,
    );
  }

  if (!user) {
    if (!(await isLocalHqObservabilityProofSession())) {
      redirect("/login");
    }
    return <DashboardShell userEmail="local-hq-observability-proof">{children}</DashboardShell>;
  }

  return (
    <DashboardShell userEmail={user.email ?? "Unknown user"}>
      {children}
    </DashboardShell>
  );
}
