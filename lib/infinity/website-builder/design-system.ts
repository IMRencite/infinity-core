import { FOUNDATION_DESIGN_LABEL } from "./constants";

export type FoundationDesignSystem = {
  label: typeof FOUNDATION_DESIGN_LABEL;
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borders: Record<string, string>;
  shadows: Record<string, string>;
  breakpoints: Record<string, string>;
  componentVariants: Record<string, string[]>;
};

/** Deterministic tokens derived from specification hash (no randomness). */
export function buildFoundationDesignSystem(specificationHash: string): FoundationDesignSystem {
  const n = specificationHash.charCodeAt(0) % 3;
  const accent = ["#2563eb", "#0d9488", "#7c3aed"][n]!;
  return {
    label: FOUNDATION_DESIGN_LABEL,
    colors: {
      background: "#ffffff",
      foreground: "#0f172a",
      muted: "#64748b",
      accent,
      accentContrast: "#ffffff",
      border: "#e2e8f0",
    },
    typography: {
      fontFamily:
        'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontFamilyMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      scaleBase: "16px",
      lineHeight: "1.5",
      headingWeight: "600",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      section: "3rem",
    },
    borders: {
      radius: "0.375rem",
      width: "1px",
    },
    shadows: {
      sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
      md: "0 4px 12px rgba(15, 23, 42, 0.1)",
    },
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
    },
    componentVariants: {
      button: ["primary", "secondary", "ghost"],
      card: ["default", "bordered"],
    },
  };
}

export function designSystemToCss(ds: FoundationDesignSystem): string {
  return `/* ${ds.label} */
:root {
  --color-bg: ${ds.colors.background};
  --color-fg: ${ds.colors.foreground};
  --color-muted: ${ds.colors.muted};
  --color-accent: ${ds.colors.accent};
  --color-accent-contrast: ${ds.colors.accentContrast};
  --color-border: ${ds.colors.border};
  --font-sans: ${ds.typography.fontFamily};
  --space-md: ${ds.spacing.md};
  --space-lg: ${ds.spacing.lg};
  --radius: ${ds.borders.radius};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: ${ds.typography.scaleBase};
  line-height: ${ds.typography.lineHeight};
  color: var(--color-fg);
  background: var(--color-bg);
}
a { color: var(--color-accent); }
main { max-width: 72rem; margin: 0 auto; padding: var(--space-lg); }
header, footer { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--color-border); }
nav ul { list-style: none; display: flex; gap: var(--space-md); padding: 0; margin: 0; flex-wrap: wrap; }
.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-radius: var(--radius);
  text-decoration: none;
  border: none;
  cursor: pointer;
}
.btn-secondary { background: transparent; color: var(--color-accent); border: 1px solid var(--color-accent); }
.placeholder { color: var(--color-muted); font-style: italic; }
`;
}
