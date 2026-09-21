export function validationGradeGlobalCss(): string {
  return `:root {
  --vg-bg: #f5f7fa;
  --vg-surface: #ffffff;
  --vg-text: #172033;
  --vg-muted: #4b5568;
  --vg-border: #d5dbe3;
  --vg-accent: #1d4f7c;
  --vg-accent-contrast: #ffffff;
  --vg-accent-hover: #163a5c;
  --vg-focus: #0f3d6b;
  --vg-max: 68rem;
  --vg-radius: 12px;
  --vg-shadow: 0 1px 2px rgba(23, 32, 51, 0.06);
}

[data-venture-tone="cre"] {
  --vg-bg: #f4f6f8;
  --vg-text: #152033;
  --vg-accent: #1d4e78;
  --vg-accent-hover: #14385a;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--vg-bg);
  color: var(--vg-text);
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  line-height: 1.55;
}

a { color: var(--vg-accent); }
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid var(--vg-focus);
  outline-offset: 2px;
}

.vg-shell { min-height: 100vh; display: flex; flex-direction: column; }
.vg-container {
  width: min(100% - 2rem, var(--vg-max));
  margin: 0 auto;
}
.vg-hero, .vg-section { padding: 3rem 0; }
.vg-hero {
  border-bottom: 1px solid var(--vg-border);
  background: var(--vg-surface);
}
.vg-hero h1 {
  margin: 0.5rem 0 1rem;
  font-size: clamp(1.75rem, 4vw, 2.6rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.vg-kicker, .vg-badge {
  display: inline-block;
  margin: 0 0 0.75rem;
  padding: 0.25rem 0.7rem;
  border: 1px solid var(--vg-border);
  border-radius: 999px;
  background: var(--vg-bg);
  color: var(--vg-muted);
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.vg-lede, .vg-muted { color: var(--vg-muted); max-width: 46rem; }
.vg-section h2 { margin: 0 0 1rem; font-size: 1.45rem; }
.vg-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.vg-feature-card, .vg-pricing-card, .vg-form, .vg-disclosure {
  background: var(--vg-surface);
  border: 1px solid var(--vg-border);
  border-radius: var(--vg-radius);
  box-shadow: var(--vg-shadow);
  padding: 1.25rem;
}
.vg-pricing-card h3, .vg-feature-card h3 { margin: 0 0 0.5rem; }
.vg-price { font-size: 1.6rem; font-weight: 650; margin: 0.35rem 0; }
.vg-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 650;
}
.vg-cta--primary {
  background: var(--vg-accent);
  color: var(--vg-accent-contrast);
  border: 1px solid var(--vg-accent);
}
.vg-cta--primary:hover { background: var(--vg-accent-hover); }
.vg-form { display: grid; gap: 0.9rem; max-width: 36rem; }
.vg-form-field { display: grid; gap: 0.35rem; }
.vg-form-field label { font-weight: 600; }
.vg-form input, .vg-form select, .vg-form textarea {
  min-height: 2.5rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--vg-border);
  border-radius: 8px;
  font: inherit;
}
.vg-form button[type="submit"] {
  min-height: 2.75rem;
  border: 0;
  border-radius: 8px;
  background: var(--vg-accent);
  color: var(--vg-accent-contrast);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}
.vg-form button[type="submit"]:hover { background: var(--vg-accent-hover); }
.vg-disclosure { margin: 1.5rem 0; color: var(--vg-muted); font-size: 0.95rem; }
.vg-legal-footer {
  margin-top: auto;
  padding: 1.5rem 0 2rem;
  border-top: 1px solid var(--vg-border);
  color: var(--vg-muted);
  font-size: 0.92rem;
}
.vg-legal-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  align-items: center;
}
.vg-legal-nav a { color: var(--vg-text); text-decoration: none; }
.vg-legal-nav a:hover { text-decoration: underline; }
.vg-legal-sep { color: var(--vg-border); }

@media (max-width: 900px) {
  .vg-card-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .vg-card-grid { grid-template-columns: 1fr; }
  .vg-hero, .vg-section { padding: 2rem 0; }
  .vg-legal-nav { row-gap: 0.65rem; }
}
`;
}
