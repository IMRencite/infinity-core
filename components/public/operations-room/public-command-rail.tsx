import type { PublicDepartmentProjection, PublicVentureProjection } from "@/lib/infinity/public-operations-projection/types";
import { PublicActivityFeed } from "./public-activity-feed";
import { PublicRecentVentures } from "./public-recent-ventures";
import styles from "./operations-room.module.css";

export function PublicCommandRail({
  departments,
  ventures,
}: {
  departments: PublicDepartmentProjection[];
  ventures: PublicVentureProjection[];
}) {
  return (
    <aside className={styles.commandSidebar} data-command-rail-sticky="true" aria-label="Public command rail">
      <PublicActivityFeed departments={departments} />
      <PublicRecentVentures ventures={ventures} />
      <nav className={styles.quickNav} aria-label="Public page sections">
        <a href="#live-operations">Live Operations</a>
        <a href="#sales-floor">Sales Floor</a>
        <a href="#public-ventures">Public Ventures</a>
        <a href="/public/privacy">Privacy</a>
        <a href="/public/terms">Terms</a>
      </nav>
    </aside>
  );
}
