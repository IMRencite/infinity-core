import type { PublicDepartmentProjection } from "@/lib/infinity/public-operations-projection/types";
import styles from "./operations-room.module.css";

export function PublicActivityFeed({ departments }: { departments: PublicDepartmentProjection[] }) {
  return (
    <section className={styles.feed} aria-label="Current public activity">
      <h2 className={styles.roomTitle}>Current Public Activity</h2>
      <ul className={styles.feedList}>
        {departments.map((row) => (
          <li key={row.public_name} data-activity-department={row.public_name}>
            {`${row.public_name} is ${row.generic_activity_label.charAt(0).toLowerCase()}${row.generic_activity_label.slice(1)}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
