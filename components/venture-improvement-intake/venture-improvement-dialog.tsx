"use client";

import { useEffect, useId, useRef } from "react";
import { CUSTOMER_IMPROVEMENT_CTA } from "@/lib/infinity/venture-improvement-intake/types";
import type { IntakeSource } from "@/lib/infinity/venture-improvement-intake/types";
import type { VentureImprovementTheme } from "./themes";
import { VentureImprovementForm } from "./venture-improvement-form";

export function VentureImprovementDialog({
  open,
  onClose,
  ventureId,
  source,
  theme,
  title = CUSTOMER_IMPROVEMENT_CTA,
  workflow,
  route,
  productArea,
  authenticatedEmail,
  customerRef,
  actionUrl,
}: {
  open: boolean;
  onClose: () => void;
  ventureId: string;
  source: IntakeSource;
  theme: VentureImprovementTheme;
  title?: string;
  workflow?: string | null;
  route?: string | null;
  productArea?: string | null;
  authenticatedEmail?: string | null;
  customerRef?: string | null;
  actionUrl?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialogRef.current;
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((el) => !el.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={theme.dialogRoot} data-venture-improvement-dialog="true">
      <div className={theme.backdrop} aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        className={theme.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="onpv-dialog-header">
          <h2 id={titleId} className={theme.title}>{title}</h2>
          <button className={theme.secondary} type="button" onClick={onClose}>Close</button>
        </header>
        <VentureImprovementForm
          ventureId={ventureId}
          source={source}
          theme={theme}
          workflow={workflow}
          route={route}
          productArea={productArea}
          authenticatedEmail={authenticatedEmail}
          customerRef={customerRef}
          actionUrl={actionUrl}
        />
      </div>
    </div>
  );
}
