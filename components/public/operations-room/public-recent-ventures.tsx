import type { PublicVentureProjection } from "@/lib/infinity/public-operations-projection/types";
import { recentPublicVentures } from "@/lib/infinity/public-operations-room/format";
import styles from "./operations-room.module.css";

export function PublicRecentVentures({ ventures }: { ventures: PublicVentureProjection[] }) {
  const recent = recentPublicVentures(ventures, 10);
  return (
    <section className={styles.recentVentures} aria-label="Top 10 most recent public ventures">
      <h2 className={styles.roomTitle}>Top 10 Most Recent Public Ventures</h2>
      {recent.length === 0 ? (
        <p className={styles.railEmpty}>No public ventures are currently listed.</p>
      ) : (
        <ol className={styles.ventureChips}>
          {recent.map((venture) => (
            <li key={venture.public_name} data-public-venture={venture.public_name}>
              {venture.public_url ? (
                <a
                  className={styles.ventureChip}
                  href={venture.public_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className={styles.ventureChipName}>{venture.public_name}</span>
                  <span className={styles.ventureChipStatus} data-venture-accent="true">{venture.status_label}</span>
                </a>
              ) : (
                <a className={styles.ventureChip} href="#public-ventures">
                  <span className={styles.ventureChipName}>{venture.public_name}</span>
                  <span className={styles.ventureChipStatus} data-venture-accent="true">{venture.status_label}</span>
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
