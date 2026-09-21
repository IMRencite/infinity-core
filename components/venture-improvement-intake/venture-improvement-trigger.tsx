"use client";

import { useState } from "react";
import { CUSTOMER_IMPROVEMENT_CTA } from "@/lib/infinity/venture-improvement-intake/types";
import type { IntakeSource } from "@/lib/infinity/venture-improvement-intake/types";
import type { VentureImprovementTheme } from "./themes";
import { VentureImprovementDialog } from "./venture-improvement-dialog";

export function VentureImprovementTrigger({
  ventureId,
  source,
  theme,
  label = CUSTOMER_IMPROVEMENT_CTA,
  workflow,
  route,
  productArea,
  authenticatedEmail,
  customerRef,
  actionUrl,
}: {
  ventureId: string;
  source: IntakeSource;
  theme: VentureImprovementTheme;
  label?: string;
  workflow?: string | null;
  route?: string | null;
  productArea?: string | null;
  authenticatedEmail?: string | null;
  customerRef?: string | null;
  actionUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span data-venture-improvement-trigger="true" data-intake-theme={theme.name}>
      <button
        className={theme.trigger}
        type="button"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <VentureImprovementDialog
        open={open}
        onClose={() => setOpen(false)}
        ventureId={ventureId}
        source={source}
        theme={theme}
        title={label}
        workflow={workflow}
        route={route}
        productArea={productArea}
        authenticatedEmail={authenticatedEmail}
        customerRef={customerRef}
        actionUrl={actionUrl}
      />
    </span>
  );
}
