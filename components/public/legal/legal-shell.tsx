import type { ReactNode } from "react";
import { ImrBrandMark } from "@/components/public/operations-room/imr-brand-mark";
import { PublicOperationsFooter } from "@/components/public/operations-room/public-operations-footer";
import styles from "./legal.module.css";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page} data-imros-legal-page="true">
      <div className={styles.shell}>
        <div className={styles.titleRow}>
          <p className={styles.kicker}>IMROS · Infinity OS</p>
          <ImrBrandMark />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Effective date: September 15, 2026</p>
        {children}
        <PublicOperationsFooter />
      </div>
    </main>
  );
}
