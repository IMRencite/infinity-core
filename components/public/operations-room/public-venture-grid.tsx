import type { PublicVentureProjection } from "@/lib/infinity/public-operations-projection/types";
import styles from "./operations-room.module.css";

export function PublicVentureGrid({ ventures }: { ventures: PublicVentureProjection[] }) {
  return (
    <section className={styles.ventures} aria-label="Public ventures">
      <h2 className={styles.roomTitle}>Public Ventures</h2>
      {ventures.length === 0 ? (
        <p>No public ventures are currently listed.</p>
      ) : (
        <ul className={styles.ventureList}>
          {ventures.map((venture) => (
            <li key={venture.public_name} data-public-venture={venture.public_name}>
              <strong>{venture.public_name}</strong>
              <span>{` — ${venture.status_label}`}</span>
              {venture.sanitized_description ? <p>{venture.sanitized_description}</p> : null}
              {venture.public_url ? (
                <p>
                  <a href={venture.public_url} rel="noreferrer" target="_blank">
                    {venture.public_url}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
